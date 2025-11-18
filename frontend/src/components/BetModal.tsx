"use client";

import { useState, useEffect } from "react";
import { usePrivy } from '@privy-io/react-auth';
import { ethers, Contract } from "ethers";
import marketArtifact from "@/abi/PredictionMarket.json";
import { MarketData, ensureBNBTestnet } from "../lib/contracts";
import { showToast } from "../lib/toast";
import toast from "react-hot-toast";

const MARKET_ABI = marketArtifact.abi;


interface BetModalProps {
  market: MarketData;
  side: boolean; // true = YES, false = NO
  onClose: () => void;
  onSuccess: () => void;
}

export default function BetModal({ market, side, onClose, onSuccess }: BetModalProps) {
  const { user, ready, authenticated } = usePrivy();
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const [walletAddress, setWalletAddress] = useState<string | null>(null);

  useEffect(() => {
    // Get wallet address from Privy or window.ethereum
    if (ready && authenticated && user) {
      const addr = user?.wallet?.address || 
                   (user?.linkedAccounts?.find((acc: any) => acc.type === 'wallet') as any)?.address;
      setWalletAddress(addr || null);
    } else if (typeof window !== "undefined" && window.ethereum) {
      // Fallback to window.ethereum if Privy not available
      window.ethereum.request({ method: 'eth_accounts' }).then((accounts: string[]) => {
        if (accounts.length > 0) {
          setWalletAddress(accounts[0]);
        }
      });
    }
  }, [ready, authenticated, user]);

  const handleBet = async () => {
    if (!amount || parseFloat(amount) <= 0) {
      showToast.error("Please enter a valid amount");
      return;
    }

    if (!walletAddress) {
      showToast.error("Please connect your wallet");
      return;
    }

    setLoading(true);
    const loadingToast = showToast.loading("Submitting transaction...");
    
    try {
      // Ensure we're on BNB Testnet before any transaction
      await ensureBNBTestnet();

      // Get provider and signer
      let provider: ethers.BrowserProvider;
      let signer: ethers.Signer;

      if (typeof window !== "undefined" && window.ethereum) {
        // Use window.ethereum (works with MetaMask, Privy, etc.)
        provider = new ethers.BrowserProvider(window.ethereum);
        signer = await provider.getSigner();
      } else {
        throw new Error("No wallet provider found");
      }

      // Create market contract with signer using new ABI
      const marketContractWithSigner = new Contract(
        market.address,
        MARKET_ABI,
        signer
      );

      // Convert amount to wei (bigint in ethers v6)
      const amountWei = ethers.parseEther(amount);

      // Call betYes or betNo
      let tx: ethers.ContractTransactionResponse;
      if (side) {
        tx = await marketContractWithSigner.betYes({
          value: amountWei, // bigint in ethers v6
        });
      } else {
        tx = await marketContractWithSigner.betNo({
          value: amountWei,
        });
      }

      // Show transaction submitted
      toast.dismiss(loadingToast);
      showToast.transaction(tx.hash, `Bet placed! ${side ? "YES" : "NO"} - ${amount} BNB`);

      // Wait for transaction confirmation
      const receipt = await tx.wait();
      
      if (receipt) {
        showToast.success(`Bet confirmed! ${side ? "YES" : "NO"} - ${amount} BNB`, receipt.hash);
      } else {
        showToast.success(`Bet confirmed! ${side ? "YES" : "NO"} - ${amount} BNB`);
      }
      onSuccess();
      onClose();
    } catch (error: any) {
      console.error("Failed to place bet", error);
      toast.dismiss(loadingToast);
      
      let errorMsg = "Failed to place bet";
      if (error.code === 4001) {
        errorMsg = "Transaction rejected by user";
      } else if (error.reason) {
        errorMsg = error.reason;
      } else if (error.message) {
        errorMsg = error.message;
      }
      
      showToast.error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  // Quick bet amounts
  const quickAmounts = ["0.01", "0.1", "0.5", "1"];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 sm:p-6">
      <div className="bg-white rounded-xl max-w-md w-full p-4 sm:p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg sm:text-xl font-bold text-gray-900">Place Bet</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition p-1 -mr-1"
            aria-label="Close"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="mb-4">
          <p className="text-xs sm:text-sm text-gray-600 mb-1">Market:</p>
          <p className="text-sm sm:text-base font-medium text-gray-900 break-words">
            {market.question || `Market: ${market.feedId}`}
          </p>
          <p className="text-xs text-gray-500 mt-1 font-mono">
            {market.address.slice(0, 6)}...{market.address.slice(-4)}
          </p>
        </div>

        <div className="mb-4">
          <div className={`inline-block px-4 py-2 rounded-lg font-semibold text-sm sm:text-base ${
            side 
              ? "bg-green-100 text-green-700" 
              : "bg-red-100 text-red-700"
          }`}>
            {side ? "YES" : "NO"}
          </div>
        </div>

        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Amount (BNB)
          </label>
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.1"
            min="0.001"
            step="0.001"
            className="w-full px-4 py-3 rounded-lg border border-gray-300 text-gray-900 focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent text-base"
          />
          
          {/* Quick amount buttons */}
          <div className="mt-2 flex gap-2 flex-wrap">
            {quickAmounts.map((quickAmt) => (
              <button
                key={quickAmt}
                type="button"
                onClick={() => setAmount(quickAmt)}
                className={`px-3 py-1.5 text-xs sm:text-sm rounded-lg border transition ${
                  amount === quickAmt
                    ? "border-black bg-black text-white"
                    : "border-gray-300 bg-white text-gray-700 hover:border-gray-400"
                }`}
              >
                {quickAmt} BNB
              </button>
            ))}
          </div>
          
          <p className="mt-2 text-xs text-gray-500">
            Minimum: 0.001 BNB
          </p>
        </div>

        {!walletAddress && (
          <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-sm text-yellow-800">
              Please connect your wallet to place a bet
            </p>
          </div>
        )}

        {walletAddress && (
          <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-xs text-blue-800">
              Wallet: {walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}
            </p>
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-3 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition text-sm sm:text-base"
            disabled={loading}
          >
            Cancel
          </button>
          <button
            onClick={handleBet}
            disabled={loading || !amount || !walletAddress}
            className={`flex-1 px-4 py-3 font-medium text-white rounded-lg transition text-sm sm:text-base ${
              side
                ? "bg-green-600 hover:bg-green-700 active:bg-green-800"
                : "bg-red-600 hover:bg-red-700 active:bg-red-800"
            } disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            {loading ? (
              <span className="flex items-center justify-center">
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Placing...
              </span>
            ) : (
              `Bet ${side ? "YES" : "NO"}`
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

