"use client";

import { useState, useEffect } from "react";
import axios from "axios";
import { formatDistanceToNow, format } from "date-fns";
import { BrowserProvider, Contract, ethers } from "ethers";
import marketArtifact from "@/abi/PredictionMarket.json";
import MarketChat from "./MarketChat";
import MarketInfo from "./MarketInfo";
import { showToast } from "../lib/toast";

const MARKET_ABI = marketArtifact.abi;

// MarketRow type: always has id (offchain) and onchainAddress (onchain)
export type MarketRow = {
  id: number;
  onchainAddress: string;
  questionOffchain?: string; // Optional offchain question (for display before onchain loads)
  category?: string;
  oracle_type?: string;
  oracle_name?: string;
  oracle_resolution_time?: string;
  creator_address?: string;
  // ... other offchain fields
};

// Onchain state from contract
type OnchainState = {
  question: string;
  deadline: number;
  resolved: boolean;
  outcome: bigint;
  status: MarketStatus;
};

type MarketStatus = "open" | "ready" | "yes" | "no";

// Fetch onchain market data using PredictionMarket ABI
async function fetchOnchainMarket(onchainAddress: string): Promise<OnchainState | null> {
  try {
    if (!onchainAddress || onchainAddress === "0x0000000000000000000000000000000000000000") {
      return null;
    }

    if (typeof window === "undefined" || !window.ethereum) {
      return null;
    }

    const provider = new BrowserProvider(window.ethereum);
    const market = new Contract(onchainAddress, MARKET_ABI, provider);

    // Try to fetch deadline, resolved, outcome - fallback if methods don't exist
    let deadline: bigint;
    let resolved: boolean;
    let outcome: bigint;
    let question: string;

    try {
      [question, deadline, resolved, outcome] = await Promise.all([
        market.question(),
        market.deadline(),
        market.resolved(),
        market.outcome(), // 0 = Undecided, 1 = Yes, 2 = No
      ]);
    } catch (err) {
      // Fallback: try using state() and other methods
      const state = await market.state();
      resolved = Number(state) === 2; // Resolved state
      
      // Try to get outcome if resolved
      if (resolved) {
        try {
          outcome = await market.outcome();
        } catch {
          outcome = 0n;
        }
      } else {
        outcome = 0n;
      }

      // Use end_time from props if deadline() doesn't exist
      deadline = BigInt(Math.floor(Date.now() / 1000) + 86400); // Default to 1 day from now
      question = "";
    }

    const now = Math.floor(Date.now() / 1000);
    let status: MarketStatus = "open";

    if (!resolved && now >= Number(deadline)) status = "ready";
    if (resolved && outcome === 1n) status = "yes";
    if (resolved && outcome === 2n) status = "no";

    return { question, deadline: Number(deadline), resolved, outcome, status };
  } catch (error) {
    console.error("Error fetching market state:", error);
    return null;
  }
}

interface Position {
  user_address: string;
  side: boolean;
  amount: string;
  created_at: string;
}

interface MarketDetailProps {
  market: MarketRow;
  onClose: () => void;
}

export default function MarketDetail({ market, onClose }: MarketDetailProps) {
  // Onchain state - fetched using market.onchainAddress
  const [onchain, setOnchain] = useState<OnchainState | null>(null);
  
  // Offchain state - fetched using market.id
  const [positions, setPositions] = useState<Position[]>([]);
  const [offchainInfo, setOffchainInfo] = useState<any>(null);
  
  // UI state
  const [loading, setLoading] = useState(true);
  const [challenging, setChallenging] = useState(false);
  const [challengeReason, setChallengeReason] = useState("");
  const [showChallengeForm, setShowChallengeForm] = useState(false);

  // Fetch onchain data using market.onchainAddress
  useEffect(() => {
    fetchOnchainMarket(market.onchainAddress).then(setOnchain);
  }, [market.onchainAddress]);

  // Fetch positions from both backend (if available) and on-chain events
  useEffect(() => {
    const fetchPositions = async () => {
      setLoading(true);
      const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
      const positionsMap = new Map<string, Position>();
      
      // Try to fetch from backend first (if market.id > 0)
      if (market.id > 0) {
        try {
          const backendPositions = await axios.get(`${API_URL}/api/markets/${market.id}/positions`);
          backendPositions.data.forEach((pos: Position) => {
            const key = `${pos.user_address.toLowerCase()}_${pos.side}`;
            positionsMap.set(key, pos);
          });
        } catch (error) {
          console.error("Failed to fetch positions from backend:", error);
        }
        
        // Fetch market info (for offchain metadata)
        try {
          const marketInfo = await axios.get(`${API_URL}/api/markets/${market.id}`);
          setOffchainInfo(marketInfo.data);
        } catch (error) {
          console.error("Failed to fetch market info:", error);
        }
      }
      
      // Also fetch positions from on-chain events
      try {
        if (typeof window !== "undefined" && window.ethereum && market.onchainAddress) {
          const provider = new BrowserProvider(window.ethereum);
          const marketContract = new Contract(market.onchainAddress, MARKET_ABI, provider);
          
          // Get function selectors for betYes and betNo from ABI
          const betYesSelector = "0xba0f51c7"; // betYes() selector
          const betNoSelector = "0x96962c94"; // betNo() selector
          
          // Query all logs from this contract to get transaction hashes
          try {
            const filter = {
              address: market.onchainAddress,
              fromBlock: 0,
              toBlock: "latest",
            };
            
            const logs = await provider.getLogs(filter);
            const txHashes = new Set<string>();
            for (const log of logs) {
              if (log.transactionHash) {
                txHashes.add(log.transactionHash);
              }
            }
            
            // Check each transaction to see if it's a betYes/betNo call
            const txPromises = Array.from(txHashes).slice(0, 100).map(async (txHash) => {
              try {
                const tx = await provider.getTransaction(txHash);
                if (tx && tx.to && tx.to.toLowerCase() === market.onchainAddress.toLowerCase() && tx.data) {
                  // Check if this is a betYes or betNo call
                  if (tx.data.startsWith(betYesSelector) || tx.data.startsWith(betNoSelector)) {
                    const side = tx.data.startsWith(betYesSelector);
                    const amount = tx.value ? ethers.formatEther(tx.value) : "0";
                    const userAddress = tx.from.toLowerCase();
                    
                    if (parseFloat(amount) > 0) {
                      return {
                        user_address: userAddress,
                        side: side,
                        amount: amount,
                        created_at: new Date().toISOString(),
                      };
                    }
                  }
                }
              } catch (err) {
                return null;
              }
              return null;
            });
            
            const txResults = await Promise.all(txPromises);
            txResults.forEach((pos) => {
              if (pos) {
                const key = `${pos.user_address}_${pos.side}`;
                if (!positionsMap.has(key)) {
                  positionsMap.set(key, pos);
                } else {
                  // Aggregate amounts for same user/side
                  const existing = positionsMap.get(key)!;
                  existing.amount = (parseFloat(existing.amount) + parseFloat(pos.amount)).toString();
                }
              }
            });
          } catch (logError: any) {
            console.warn("Failed to fetch positions from chain events:", logError.message);
          }
        }
      } catch (error) {
        console.error("Failed to fetch positions from chain:", error);
      }
      
      setPositions(Array.from(positionsMap.values()));
      setLoading(false);
    };
    
    fetchPositions();
  }, [market.id, market.onchainAddress]);

  // Get market status from onchain state
  const marketStatus = onchain?.status || null;

  const handleChallengeOracle = async () => {
    if (!challengeReason.trim()) {
      showToast.error("Please provide a reason for challenging the oracle");
      return;
    }

    setChallenging(true);
    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
      const response = await axios.post(
        `${API_URL}/api/markets/${market.id}/challenge`,
        {
          reason: challengeReason,
          challengerAddress: "0x0000000000000000000000000000000000000000", // Would get from wallet in production
        }
      );
      
      showToast.success(
        `Oracle challenge submitted! Challenge ID: ${response.data.challenge_id}`
      );
      setShowChallengeForm(false);
      setChallengeReason("");
    } catch (error: any) {
      console.error("Failed to challenge oracle:", error);
      const errorMsg = error.response?.data?.error || error.message || "Failed to submit challenge";
      showToast.error(errorMsg);
    } finally {
      setChallenging(false);
    }
  };

  // Calculate liquidity from positions
  const yesPositions = positions.filter(p => p.side);
  const noPositions = positions.filter(p => !p.side);
  const yesLiquidity = yesPositions.reduce((sum, p) => sum + parseFloat(p.amount || "0"), 0);
  const noLiquidity = noPositions.reduce((sum, p) => sum + parseFloat(p.amount || "0"), 0);
  const totalLiquidity = yesLiquidity + noLiquidity;
  const yesPercentage = totalLiquidity > 0 ? (yesLiquidity / totalLiquidity) * 100 : 50;
  const noPercentage = totalLiquidity > 0 ? (noLiquidity / totalLiquidity) * 100 : 50;

  // Use onchain question if available, otherwise fallback to offchain
  const displayQuestion = onchain?.question || market.questionOffchain || `Market ${market.onchainAddress.slice(0, 8)}...${market.onchainAddress.slice(-6)}`;
  
  // Use onchain deadline if available
  const deadlineDate = onchain?.deadline ? new Date(onchain.deadline * 1000) : null;

  // Safe date formatting with fallback to mock dates
  const formatDateSafe = (dateString: string | undefined | null, fallback: string = "N/A") => {
    if (!dateString) return fallback;
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) {
        // Invalid date, return mock date
        const mockDate = new Date();
        mockDate.setDate(mockDate.getDate() + 30); // 30 days from now
        return format(mockDate, "MMM d, yyyy 'at' h:mm a");
      }
      return format(date, "MMM d, yyyy 'at' h:mm a");
    } catch (e) {
      // Error parsing date, return mock date
      const mockDate = new Date();
      mockDate.setDate(mockDate.getDate() + 30);
      return format(mockDate, "MMM d, yyyy 'at' h:mm a");
    }
  };

  const formatDistanceSafe = (dateString: string | undefined | null, fallback: string = "N/A") => {
    if (!dateString) return fallback;
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) {
        // Invalid date, return mock distance
        const mockDate = new Date();
        mockDate.setDate(mockDate.getDate() + 30);
        return formatDistanceToNow(mockDate, { addSuffix: true });
      }
      return formatDistanceToNow(date, { addSuffix: true });
    } catch (e) {
      // Error parsing date, return mock distance
      const mockDate = new Date();
      mockDate.setDate(mockDate.getDate() + 30);
      return formatDistanceToNow(mockDate, { addSuffix: true });
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between z-10">
          <h2 className="text-2xl font-bold text-gray-900">Market Details</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Question */}
          <div>
            <h3 className="text-xl font-semibold text-gray-900 mb-4 break-words">
              {displayQuestion}
            </h3>
            
            {/* Meta Info */}
            <div className="flex flex-wrap items-center gap-2 mb-4">
              {market.category && (
                <span className="px-3 py-1 text-sm font-medium text-gray-600 bg-gray-100 rounded-md">
                  {market.category}
                </span>
              )}
              <span className={`px-3 py-1 text-sm font-medium rounded-md ${
                market.oracle_type === "chainlink"
                  ? "bg-blue-100 text-blue-700"
                  : market.oracle_type === "uma"
                  ? "bg-purple-100 text-purple-700"
                  : "bg-blue-100 text-blue-700"
              }`}>
                {market.oracle_name || (market.oracle_type === "chainlink" ? "Chainlink" : market.oracle_type === "uma" ? "UMA" : "Chainlink")}
                {market.oracle_resolution_time && ` • ${market.oracle_resolution_time}`}
              </span>
              {/* Market Status Badge - from onchain state */}
              {marketStatus && (
                <span className={`px-3 py-1 text-sm font-medium rounded-md ${
                  marketStatus === "open"
                    ? "bg-green-100 text-green-700"
                    : marketStatus === "ready"
                    ? "bg-yellow-100 text-yellow-700"
                    : marketStatus === "yes"
                    ? "bg-blue-100 text-blue-700"
                    : marketStatus === "no"
                    ? "bg-red-100 text-red-700"
                    : "bg-gray-100 text-gray-600"
                }`}>
                  {marketStatus === "open" && "Open"}
                  {marketStatus === "ready" && "Ready to resolve"}
                  {marketStatus === "yes" && "Resolved: Yes"}
                  {marketStatus === "no" && "Resolved: No"}
                </span>
              )}
              {!marketStatus && onchain === null && (
                <span className="px-3 py-1 text-sm font-medium rounded-md bg-gray-100 text-gray-600">
                  Loading...
                </span>
              )}
            </div>
          </div>

          {/* Market Info Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="text-sm text-gray-500 mb-1">Market ID</div>
              <div className="text-lg font-semibold text-gray-900">#{market.id}</div>
            </div>
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="text-sm text-gray-500 mb-1">Onchain Address</div>
              <div className="text-sm font-mono text-gray-900 truncate">
                {market.onchainAddress}
              </div>
            </div>
            {market.creator_address && (
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="text-sm text-gray-500 mb-1">Creator</div>
                <div className="text-sm font-mono text-gray-900 truncate">
                  {market.creator_address}
                </div>
              </div>
            )}
            {deadlineDate && (
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="text-sm text-gray-500 mb-1">Deadline</div>
                <div className="text-sm font-medium text-gray-900">
                  {format(deadlineDate, "MMM d, yyyy 'at' h:mm a")}
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  {formatDistanceToNow(deadlineDate, { addSuffix: true })}
                </div>
              </div>
            )}
            {offchainInfo?.resolution_time && (
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="text-sm text-gray-500 mb-1">Resolution Time</div>
                <div className="text-sm font-medium text-gray-900">
                  {formatDateSafe(offchainInfo.resolution_time)}
                </div>
              </div>
            )}
          </div>

          {/* Liquidity Breakdown */}
          <div className="border-t border-gray-200 pt-6">
            <h4 className="text-lg font-semibold text-gray-900 mb-4">Liquidity Breakdown</h4>
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-green-700">YES</span>
                  <span className="text-sm font-semibold text-gray-900">
                    {yesLiquidity.toFixed(2)} BNB ({yesPercentage.toFixed(1)}%)
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div 
                    className="bg-green-500 h-3 rounded-full transition-all"
                    style={{ width: `${yesPercentage}%` }}
                  />
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-red-700">NO</span>
                  <span className="text-sm font-semibold text-gray-900">
                    {noLiquidity.toFixed(2)} BNB ({noPercentage.toFixed(1)}%)
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div 
                    className="bg-red-500 h-3 rounded-full transition-all"
                    style={{ width: `${noPercentage}%` }}
                  />
                </div>
              </div>
              <div className="pt-2 border-t border-gray-200">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-600">Total Liquidity</span>
                  <span className="text-lg font-bold text-gray-900">
                    {totalLiquidity.toFixed(2)} BNB
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Positions */}
          <div className="border-t border-gray-200 pt-6">
            <h4 className="text-lg font-semibold text-gray-900 mb-4">
              Positions ({positions.length})
            </h4>
            {loading ? (
              <div className="text-center py-8 text-gray-500">Loading positions...</div>
            ) : positions.length === 0 ? (
              <div className="text-center py-8 text-gray-500">No positions yet</div>
            ) : (
              <div className="space-y-2">
                {positions.map((position, idx) => (
                  <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <span className={`px-2 py-1 text-xs font-medium rounded ${
                        position.side 
                          ? "bg-green-100 text-green-700" 
                          : "bg-red-100 text-red-700"
                      }`}>
                        {position.side ? "YES" : "NO"}
                      </span>
                      <span className="text-sm font-mono text-gray-600">
                        {position.user_address.slice(0, 6)}...{position.user_address.slice(-4)}
                      </span>
                    </div>
                    <span className="text-sm font-semibold text-gray-900">
                      {parseFloat(position.amount).toFixed(4)} BNB
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Oracle Challenge Section */}
          {(marketStatus === "yes" || marketStatus === "no" || (onchain?.resolved && onchain.resolved)) && (
            <div className="border-t border-gray-200 pt-6">
              <h4 className="text-lg font-semibold text-gray-900 mb-4">Oracle Resolution</h4>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0">
                    <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <div className="text-sm font-medium text-blue-900 mb-1">
                      Resolved via {market.oracle_name || "Oracle"}
                    </div>
                    <div className="text-sm text-blue-700">
                      Outcome: <span className="font-semibold">
                        {marketStatus === "yes" ? "YES" : marketStatus === "no" ? "NO" : onchain?.outcome === 1n ? "YES" : onchain?.outcome === 2n ? "NO" : "Pending"}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {!showChallengeForm ? (
                <button
                  onClick={() => setShowChallengeForm(true)}
                  className="w-full px-4 py-3 bg-yellow-50 hover:bg-yellow-100 border border-yellow-200 rounded-lg text-yellow-800 font-medium transition"
                >
                  Challenge Oracle Resolution
                </button>
              ) : (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-yellow-900 mb-2">
                      Reason for Challenge
                    </label>
                    <textarea
                      value={challengeReason}
                      onChange={(e) => setChallengeReason(e.target.value)}
                      placeholder="Explain why you believe the oracle resolution is incorrect..."
                      className="w-full px-3 py-2 border border-yellow-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500 text-sm"
                      rows={4}
                    />
                  </div>
                  <div className="flex gap-3">
                    <button
                      onClick={handleChallengeOracle}
                      disabled={challenging || !challengeReason.trim()}
                      className="flex-1 px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg font-medium transition disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {challenging ? "Submitting..." : "Submit Challenge"}
                    </button>
                    <button
                      onClick={() => {
                        setShowChallengeForm(false);
                        setChallengeReason("");
                      }}
                      className="px-4 py-2 bg-white hover:bg-gray-50 border border-yellow-300 text-yellow-800 rounded-lg font-medium transition"
                    >
                      Cancel
                    </button>
                  </div>
                  <p className="text-xs text-yellow-700">
                    ⚠️ Challenging an oracle resolution requires staking BNB. If your challenge is successful, you'll receive a reward. If unsuccessful, your stake may be slashed.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Oracle Info */}
          <div className="border-t border-gray-200 pt-6">
            <h4 className="text-lg font-semibold text-gray-900 mb-4">Oracle Information</h4>
            <div className="bg-gray-50 rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Provider</span>
                <span className="text-sm font-medium text-gray-900">
                  {market.oracle_name || (market.oracle_type === "chainlink" ? "Chainlink" : market.oracle_type === "uma" ? "UMA" : "Chainlink")}
                </span>
              </div>
              {market.oracle_type === "uma" && (
                <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <p className="text-xs text-yellow-800">
                    ⚠️ <strong>Work in Progress:</strong> UMA requires an offchain router/mirror (not supported on BNB Testnet)
                  </p>
                </div>
              )}
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Type</span>
                <span className="text-sm font-medium text-gray-900">
                  {market.oracle_type === "chainlink" ? "Price Feed (24 hr)" : market.oracle_type === "uma" ? "Arbitrary Event (48 hr)" : "Price Feed (24 hr)"}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Resolution Time</span>
                <span className="text-sm font-medium text-gray-900">
                  {market.oracle_resolution_time || "15 min"}
                </span>
              </div>
            </div>
          </div>

          {/* Social Elements - always use market.id for offchain data (only if id > 0) */}
          {market.id > 0 && (
            <>
              <MarketInfo marketId={market.id} />
              <MarketChat marketId={market.id} />
            </>
          )}
          {market.id <= 0 && (
            <div className="border-t border-gray-200 pt-6">
              <p className="text-sm text-gray-500 text-center">
                Market info and chat are only available for markets registered in the backend.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

