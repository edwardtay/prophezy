import { useState, useEffect, useCallback } from "react";
import { ethers, BrowserProvider, Contract } from "ethers";
import axios from "axios";
import marketArtifact from "@/abi/PredictionMarket.json";
import {
  getFactoryContract,
  getProvider,
  MarketData,
  MarketState,
  FACTORY_ADDRESS,
} from "../lib/contracts";

const MARKET_ABI = marketArtifact.abi;

/**
 * Calculate trending score based on liquidity and activity
 */
function calculateTrendingScore(market: MarketData): number {
  const totalYes = parseFloat(market.totalYes);
  const totalNo = parseFloat(market.totalNo);
  const totalLiquidity = totalYes + totalNo;
  
  // Base score from liquidity (volume)
  let score = totalLiquidity;
  
  // Boost for active markets
  if (market.state === MarketState.Active) {
    score *= 1.2;
  }
  
  // Boost for markets with balanced liquidity (more interesting)
  if (totalLiquidity > 0) {
    const balance = Math.min(totalYes, totalNo) / Math.max(totalYes, totalNo);
    score *= (1 + balance * 0.3); // Up to 30% boost for balanced markets
  }
  
  return score;
}

/**
 * Hook to fetch all markets from the factory
 */
export function useMarkets() {
  const [markets, setMarkets] = useState<MarketData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMarkets = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const provider = getProvider();
      const factory = getFactoryContract(provider);

      // Get all market addresses from factory (ONLY on-chain markets - no mocks)
      const marketAddresses: string[] = await factory.getMarkets();
      
      // Single getLogs call for all MarketCreated events (more efficient, avoids rate limits)
      const creationTxMap = new Map<string, string>();
      const creatorByMarket: Record<string, string> = {};
      try {
        // Query all MarketCreated events from the factory contract in one call
        // Event signature: MarketCreated(address indexed market, address indexed creator, address indexed feedAddress)
        const MARKET_CREATED_TOPIC = ethers.id("MarketCreated(address,address,address)");
        
        // Use a reasonable fromBlock - you can adjust this or use deployment block
        // For now, query from block 0 (or use a known deployment block if available)
        const filter = {
          address: FACTORY_ADDRESS,
          topics: [MARKET_CREATED_TOPIC],
          fromBlock: 0, // Start from beginning, or use deployment block if known
          toBlock: "latest",
        };
        
        const logs = await provider.getLogs(filter);
        
        // Build map: marketAddress -> creator (and also store tx hash)
        for (const log of logs) {
          try {
            // Parse the event log
            let parsed: any = null;
            try {
              parsed = factory.interface.parseLog({
                topics: log.topics,
                data: log.data,
              });
            } catch (parseErr) {
              // Fallback: extract directly from topics if parsing fails
              if (log.topics && log.topics.length >= 3) {
                const marketAddress = ethers.getAddress("0x" + log.topics[1].slice(26)).toLowerCase();
                const creatorAddress = ethers.getAddress("0x" + log.topics[2].slice(26)).toLowerCase();
                creatorByMarket[marketAddress] = creatorAddress;
                creationTxMap.set(marketAddress, log.transactionHash);
                continue;
              }
            }
            
            if (parsed && parsed.args) {
              const market = parsed.args.market?.toLowerCase() || parsed.args[0]?.toLowerCase();
              const creator = parsed.args.creator?.toLowerCase() || parsed.args[1]?.toLowerCase();
              
              if (market && creator) {
                creatorByMarket[market] = creator;
                creationTxMap.set(market, log.transactionHash);
              }
            }
          } catch (parseErr) {
            console.warn(`[useMarkets] Error parsing log ${log.transactionHash}:`, parseErr);
          }
        }
        
      } catch (err) {
        console.warn("Failed to fetch MarketCreated events:", err);
      }

      // Fetch metadata from backend API (ONLY for enriching on-chain markets with metadata - not for displaying)
      // Backend markets are matched to on-chain markets by market_address
      let backendMarkets: any[] = [];
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
        const response = await axios.get(`${apiUrl}/api/markets`);
        backendMarkets = response.data || [];
      } catch (err) {
        console.warn("Failed to fetch market metadata from backend:", err);
      }

      // Create a map of backend markets by market_address (primary) and feedId (fallback) for quick lookup
      const backendMapByAddress = new Map<string, any>();
      const backendMapByFeedId = new Map<string, any>();
      backendMarkets.forEach((m: any) => {
        // Primary: match by market_address if available
        if (m.market_address) {
          const addrLower = m.market_address.toLowerCase();
          backendMapByAddress.set(addrLower, m);
        }
        // Fallback: match by feedId if available
        if (m.feed_id) {
          const feedIdLower = m.feed_id.toLowerCase();
          backendMapByFeedId.set(feedIdLower, m);
          // Also try without 0x prefix if present
          if (feedIdLower.startsWith('0x')) {
            backendMapByFeedId.set(feedIdLower.slice(2), m);
          }
        }
      });

      // Fetch data for each market using new ABI
      const marketPromises = marketAddresses.map(async (address) => {
        // Use BrowserProvider and Contract directly with new ABI
        let providerForContract: BrowserProvider;
        if (typeof window !== "undefined" && window.ethereum) {
          providerForContract = new BrowserProvider(window.ethereum);
        } else {
          providerForContract = provider as any as BrowserProvider;
        }
        const marketContract = new Contract(address, MARKET_ABI, providerForContract);

        try {
          // Wrap each call in a promise that catches errors
          const safeCall = async (fn: () => Promise<any>, defaultValue: any) => {
            try {
              return await fn();
            } catch {
              return defaultValue;
            }
          };
          
          // Use new ABI methods: question, deadline, resolved, outcome
          // Also try to read creator directly from contract if available
          const [question, deadline, resolved, outcome] = await Promise.all([
            marketContract.question(),
            marketContract.deadline(),
            marketContract.resolved(),
            marketContract.outcome(), // enum: 0,1,2
          ]);
          
          // Try to read creator directly from contract (simplest method)
          let creatorFromContract: string | null = null;
          try {
            creatorFromContract = await marketContract.creator();
          } catch (err) {
            // Contract might not have creator() function, that's okay
          }

          // Try to get additional data if methods exist (for backward compatibility)
          let lockPrice = 0n;
          let totalYes = 0n;
          let totalNo = 0n;
          let feedId = "0x0";
          let state = MarketState.Active;

          try {
            [lockPrice, state, totalYes, totalNo, feedId] = await Promise.all([
              safeCall(() => marketContract.lockPrice(), 0n),
              safeCall(() => marketContract.state(), 0),
              safeCall(() => marketContract.totalYes(), 0n),
              safeCall(() => marketContract.totalNo(), 0n),
              safeCall(() => marketContract.feedId(), "0x0"),
            ]);
          } catch (err) {
            // If methods don't exist, defaults are already set above
            console.warn(`Some optional methods not available for market ${address}, using defaults`);
          }

          // Calculate current price from totalYes and totalNo
          // Current price = totalYes / (totalYes + totalNo)
          let currentPrice = "0";
          const totalYesFloat = parseFloat(totalYes > 0n ? ethers.formatEther(totalYes) : "0");
          const totalNoFloat = parseFloat(totalNo > 0n ? ethers.formatEther(totalNo) : "0");
          const totalLiquidity = totalYesFloat + totalNoFloat;
          
          if (totalLiquidity > 0) {
            const priceRatio = totalYesFloat / totalLiquidity;
            currentPrice = priceRatio.toFixed(4); // Format to 4 decimal places (0.0000 to 1.0000)
          }

          // Map resolved/outcome to MarketState
          if (resolved) {
            state = MarketState.Resolved;
          } else if (Number(deadline) <= Math.floor(Date.now() / 1000)) {
            state = MarketState.Locked;
          } else {
            state = MarketState.Active;
          }

          // Convert feedId bytes32 to string (remove null bytes) if it's a bytes32
          let feedIdStr = "";
          let feedIdHex = "0x0";
          if (feedId && feedId !== "0x0") {
            try {
              feedIdStr = ethers.toUtf8String(feedId).replace(/\0/g, "");
              feedIdHex = feedIdStr || ethers.hexlify(feedId);
            } catch {
              feedIdHex = typeof feedId === "string" ? feedId : ethers.hexlify(feedId);
            }
          }
          
          // Try to find matching backend metadata
          // Primary: match by market address (most reliable)
          const addressLower = address.toLowerCase();
          let backendMarket = backendMapByAddress.get(addressLower);
          
          // Fallback: match by feedId if address match failed
          if (!backendMarket) {
            const feedIdLower = feedIdHex.toLowerCase();
            const feedIdNoPrefix = feedIdLower.startsWith('0x') ? feedIdLower.slice(2) : feedIdLower;
            backendMarket = backendMapByFeedId.get(feedIdLower) || 
                           backendMapByFeedId.get(feedIdNoPrefix) ||
                           backendMapByFeedId.get(feedIdStr.toLowerCase());
          }

          const creationTxHash = creationTxMap.get(addressLower);
          
          // Priority 1: Read creator directly from contract (simplest and most reliable)
          let creatorAddress = creatorFromContract ? creatorFromContract.toLowerCase() : null;
          
          // Priority 2: Use creator from event map (from single getLogs call)
          if (!creatorAddress) {
            creatorAddress = creatorByMarket[addressLower] || null;
          }
          
          // Priority 3: Use backend creator_address
          if (!creatorAddress && backendMarket?.creator_address) {
            creatorAddress = backendMarket.creator_address.toLowerCase();
          }

          // Extract imageUrl from backend market (support both snake_case and camelCase)
          const imageUrl = backendMarket?.image_url || backendMarket?.imageUrl || null;

          // Ensure we always have a question - prioritize contract, then backend, then fallback
          const displayQuestion = question || backendMarket?.question || `Market ${address.slice(0, 8)}...${address.slice(-6)}`;
          
          // Category: use backend if available, otherwise try to infer or use "Other"
          const displayCategory = backendMarket?.category || "Other";
          
          const marketData: MarketData = {
            address,
            feedId: feedIdHex,
            currentPrice: currentPrice, // Calculated from totalYes/totalNo ratio
            lockPrice: lockPrice > 0n ? ethers.formatEther(lockPrice) : "0",
            state: state as MarketState,
            totalYes: totalYes > 0n ? ethers.formatEther(totalYes) : "0",
            totalNo: totalNo > 0n ? ethers.formatEther(totalNo) : "0",
            // Use question from contract first (most reliable), fallback to backend, then generic
            question: displayQuestion,
            category: displayCategory,
            description: backendMarket?.description,
            imageUrl: imageUrl, // Set imageUrl explicitly (from backend if available)
            creationTxHash: creationTxHash,
            creatorAddress: creatorAddress, // Should always be set by now (from events or backend)
            createdAt: backendMarket?.created_at || backendMarket?.createdAt, // Support both naming conventions
            // Include backend market_id for API calls (MarketInfo, MarketChat)
            marketId: backendMarket?.market_id || backendMarket?.id || undefined,
          };
          

          return marketData;
        } catch (err: any) {
          console.error(`Error fetching market ${address}:`, err);
          // Try to get at least basic data using new ABI if other calls fail
          let question = "";
          let deadline = 0;
          let resolved = false;
          let outcome = 0n;
          
          try {
            const basicContract = new Contract(address, MARKET_ABI, providerForContract);
            [question, deadline, resolved, outcome] = await Promise.all([
              basicContract.question(),
              basicContract.deadline(),
              basicContract.resolved(),
              basicContract.outcome(),
            ]);
          } catch (questionErr) {
            console.warn(`Could not fetch basic data for market ${address}:`, questionErr);
          }
          
          // Determine state from resolved/deadline
          let state = MarketState.Active;
          if (resolved) {
            state = MarketState.Resolved;
          } else if (deadline > 0 && deadline <= Math.floor(Date.now() / 1000)) {
            state = MarketState.Locked;
          }
          
          // Return minimal data if contract call fails, but still include the address
          // This ensures markets are shown even if some calls fail
          return {
            address,
            feedId: "",
            currentPrice: "0",
            lockPrice: "0",
            state: state,
            totalYes: "0",
            totalNo: "0",
            question: question || `Market ${address.slice(0, 8)}...${address.slice(-6)}`,
          } as MarketData;
        }
      });

      const marketData = await Promise.all(marketPromises);
      
      // No need for batch fetching - we already have creators from the single getLogs call
      // Just check if any markets are still missing creators (shouldn't happen if events were parsed correctly)
      const marketsNeedingCreators = marketData.filter(m => 
        m.address && 
        m.address !== "0x0000000000000000000000000000000000000000" &&
        !m.creatorAddress
      );
      
      if (marketsNeedingCreators.length > 0) {
        console.warn(`[useMarkets] ${marketsNeedingCreators.length} markets still missing creators after event parsing. This shouldn't happen if events were parsed correctly.`);
      }
      
      // Auto-sync: Create backend entries for on-chain markets missing backend metadata
      // This ensures all markets have complete data
      const marketsNeedingBackendSync = marketData.filter(m => 
        m.address && 
        m.address !== "0x0000000000000000000000000000000000000000" &&
        !m.marketId && // No backend ID means no backend entry
        m.question && // Has question from contract
        m.question !== `Market ${m.address.slice(0, 8)}...${m.address.slice(-6)}` // Not just fallback
      );
      
      if (marketsNeedingBackendSync.length > 0) {
        // Try to create backend entries for these markets (non-blocking)
        Promise.all(marketsNeedingBackendSync.map(async (market) => {
          try {
            const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
            // Check if backend entry already exists
            const backendMarkets = await axios.get(`${apiUrl}/api/markets`);
            const exists = backendMarkets.data.some((m: any) => 
              m.market_address?.toLowerCase() === market.address.toLowerCase()
            );
            
            if (!exists && market.question && market.creatorAddress) {
              // Create backend entry with contract data
              await axios.post(`${apiUrl}/api/markets`, {
                question: market.question,
                category: market.category || "Other",
                duration: 7 * 24 * 60 * 60, // Default 7 days
                resolutionDelay: 24 * 60 * 60, // Default 24 hours
                imageUrl: market.imageUrl || null,
                oracleType: "chainlink", // Default
                creatorAddress: market.creatorAddress,
                marketAddress: market.address,
              });
            }
          } catch (err) {
            // Silently fail - this is just a sync attempt
          }
        })).catch(() => {
          // Ignore errors - this is best effort
        });
      }
      
      // Filter out markets with empty/invalid addresses - only show real on-chain markets
      const validMarkets = marketData.filter(m => {
        // Must have a valid address
        if (!m.address || m.address === "0x0000000000000000000000000000000000000000") {
          return false;
        }
        // Must be a valid Ethereum address format
        if (!/^0x[a-fA-F0-9]{40}$/.test(m.address)) {
          return false;
        }
        // Must have been fetched from factory (exists in marketAddresses)
        return true;
      });
      
      const marketsWithCreators = validMarkets.filter(m => m.creatorAddress).length;
      
      // Calculate trending scores and add to market data
      const marketsWithTrending = validMarkets.map(market => ({
        ...market,
        trendingScore: calculateTrendingScore(market),
      }));
      
      
      setMarkets(marketsWithTrending);
    } catch (err: any) {
      console.error("Failed to fetch markets:", err);
      setError(err.message || "Failed to fetch markets");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMarkets();
  }, [fetchMarkets]);

  return { markets, loading, error, refetch: fetchMarkets };
}

/**
 * Hook to fetch a single market's data
 */
export function useMarket(marketAddress: string | null) {
  const [market, setMarket] = useState<MarketData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!marketAddress) {
      setLoading(false);
      return;
    }
    fetchMarket();
  }, [marketAddress]);

  const fetchMarket = async () => {
    if (!marketAddress) return;

    try {
      setLoading(true);
      setError(null);

      // Use BrowserProvider and Contract directly with new ABI
      let providerForContract: BrowserProvider;
      if (typeof window !== "undefined" && window.ethereum) {
        providerForContract = new BrowserProvider(window.ethereum);
      } else {
        const baseProvider = getProvider();
        providerForContract = baseProvider as any as BrowserProvider;
      }
      
      const marketContract = new Contract(marketAddress, MARKET_ABI, providerForContract);

      // Use new ABI methods: question, deadline, resolved, outcome
      const [question, deadline, resolved, outcome] = await Promise.all([
        marketContract.question(),
        marketContract.deadline(),
        marketContract.resolved(),
        marketContract.outcome(), // enum: 0,1,2
      ]);

      // Try to get additional data if methods exist (for backward compatibility)
      let lockPrice = 0n;
      let totalYes = 0n;
      let totalNo = 0n;
      let feedId = "0x0";
      let state = MarketState.Active;

      // Try to get additional data if methods exist (for backward compatibility)
      // Wrap each call in a promise that catches errors
      const safeCall = async (fn: () => Promise<any>, defaultValue: any) => {
        try {
          return await fn();
        } catch {
          return defaultValue;
        }
      };

      try {
        [lockPrice, state, totalYes, totalNo, feedId] = await Promise.all([
          safeCall(() => marketContract.lockPrice(), 0n),
          safeCall(() => marketContract.state(), 0),
          safeCall(() => marketContract.totalYes(), 0n),
          safeCall(() => marketContract.totalNo(), 0n),
          safeCall(() => marketContract.feedId(), "0x0"),
        ]);
      } catch (err) {
        // If methods don't exist, defaults are already set above
        console.warn(`Some optional methods not available for market ${marketAddress}, using defaults`);
      }

      // Calculate current price from totalYes and totalNo
      // Current price = totalYes / (totalYes + totalNo)
      let currentPrice = "0";
      const totalYesFloat = parseFloat(totalYes > 0n ? ethers.formatEther(totalYes) : "0");
      const totalNoFloat = parseFloat(totalNo > 0n ? ethers.formatEther(totalNo) : "0");
      const totalLiquidity = totalYesFloat + totalNoFloat;
      
      if (totalLiquidity > 0) {
        const priceRatio = totalYesFloat / totalLiquidity;
        currentPrice = priceRatio.toFixed(4); // Format to 4 decimal places (0.0000 to 1.0000)
      }

      // Map resolved/outcome to MarketState
      if (resolved) {
        state = MarketState.Resolved;
      } else if (Number(deadline) <= Math.floor(Date.now() / 1000)) {
        state = MarketState.Locked;
      } else {
        state = MarketState.Active;
      }

      // Convert feedId bytes32 to string if available
      let feedIdStr = "";
      let feedIdHex = "0x0";
      if (feedId && feedId !== "0x0") {
        try {
          feedIdStr = ethers.toUtf8String(feedId).replace(/\0/g, "");
          feedIdHex = feedIdStr || ethers.hexlify(feedId);
        } catch {
          feedIdHex = typeof feedId === "string" ? feedId : ethers.hexlify(feedId);
        }
      }

      setMarket({
        address: marketAddress,
        feedId: feedIdHex,
        currentPrice: currentPrice, // Calculated from totalYes/totalNo ratio
        lockPrice: lockPrice > 0n ? ethers.formatEther(lockPrice) : "0",
        state: state as MarketState,
        totalYes: totalYes > 0n ? ethers.formatEther(totalYes) : "0",
        totalNo: totalNo > 0n ? ethers.formatEther(totalNo) : "0",
        question: question,
      });
    } catch (err: any) {
      console.error("Failed to fetch market:", err);
      setError(err.message || "Failed to fetch market");
    } finally {
      setLoading(false);
    }
  };

  return { market, loading, error, refetch: fetchMarket };
}

