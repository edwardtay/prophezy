"use client";

import Link from "next/link";
import { MarketData, MarketState } from "../lib/contracts";
import { useCountdown } from "../hooks/useCountdown";

interface MarketCardProps {
  market: MarketData;
  sortBy: "trending" | "newest" | "oldest";
  onBetClick: (market: MarketData, side: boolean) => void;
  getStatusColor: (state: MarketState) => string;
  getStatusText: (state: MarketState) => string;
  calculateOdds: (market: MarketData, side: boolean) => number;
}

export default function MarketCard({
  market,
  sortBy,
  onBetClick,
  getStatusColor,
  getStatusText,
  calculateOdds,
}: MarketCardProps) {
  const yesOdds = calculateOdds(market, true);
  const noOdds = calculateOdds(market, false);
  const totalLiquidity = parseFloat(market.totalYes) + parseFloat(market.totalNo);
  const isActive = market.state === MarketState.Active;
  const countdown = useCountdown(market.deadline);

  return (
    <Link
      href={`/market/${market.address}`}
      className="block bg-white rounded-xl border border-gray-200 p-4 sm:p-6 hover:shadow-md transition-shadow cursor-pointer overflow-hidden"
    >
      {/* Market Image - Always show if available */}
      {market.imageUrl ? (
        <div className="mb-4 -mx-4 sm:-mx-6 -mt-4 sm:-mt-6">
          <img
            src={market.imageUrl}
            alt={market.question || "Market image"}
            className="w-full h-48 sm:h-56 object-cover rounded-t-xl"
            onError={(e) => {
              // Hide image if it fails to load
              (e.target as HTMLImageElement).style.display = 'none';
            }}
          />
        </div>
      ) : (
        <div className="mb-4 -mx-4 sm:-mx-6 -mt-4 sm:-mt-6 bg-gradient-to-br from-purple-100 to-blue-100 h-48 sm:h-56 flex items-center justify-center rounded-t-xl">
          <svg className="w-16 h-16 text-purple-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
        </div>
      )}
      
      {/* Creator Address - Always show if available */}
      {market.creatorAddress && market.creatorAddress !== "0x0000000000000000000000000000000000000000" ? (
        <div className="mb-2 text-xs text-gray-600 flex items-center gap-1.5" onClick={(e) => e.preventDefault()}>
          <svg className="w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
          <span className="text-gray-500">Created by </span>
          <a
            href={`https://testnet.bscscan.com/address/${market.creatorAddress}`}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              window.open(`https://testnet.bscscan.com/address/${market.creatorAddress}`, '_blank');
            }}
            className="text-blue-600 hover:text-blue-800 hover:underline font-mono font-medium"
          >
            {market.creatorAddress.slice(0, 8)}...{market.creatorAddress.slice(-6)}
          </a>
        </div>
      ) : (
        <div className="mb-2 text-xs text-gray-400 flex items-center gap-1.5">
          <svg className="w-3.5 h-3.5 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
          <span className="text-gray-400">Creator: Unknown</span>
        </div>
      )}
      
      {/* Question/Feed ID */}
      <h3 className="text-lg sm:text-xl font-semibold text-gray-900 mb-3 hover:text-blue-600 transition break-words">
        {market.question || `Market: ${market.address.slice(0, 8)}...${market.address.slice(-6)}`}
      </h3>
      
      {/* Meta Info */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        {market.category && (
          <span className="px-2.5 py-1 text-xs font-medium text-gray-600 bg-gray-100 rounded-md">
            {market.category}
          </span>
        )}
        {sortBy === "trending" && market.trendingScore != null && market.trendingScore > 0 && (
          <span className="px-2.5 py-1 text-xs font-medium text-orange-600 bg-orange-100 rounded-md flex items-center gap-1">
            <span>🔥</span>
            <span>Trending</span>
          </span>
        )}
        {market.feedId && market.feedId !== "0x0" && (
          <span className="px-2.5 py-1 text-xs font-medium text-gray-600 bg-blue-100 text-blue-700 rounded-md">
            Feed: {market.feedId.slice(0, 10)}...
          </span>
        )}
        <span className={`px-2.5 py-1 text-xs font-medium rounded-md ${getStatusColor(market.state)}`}>
          {getStatusText(market.state)}
        </span>
        {market.state === MarketState.Locked && (
          <span className="px-2.5 py-1 text-xs font-medium text-gray-600">
            Lock Price: {parseFloat(market.lockPrice).toFixed(4)}
          </span>
        )}
        {market.creationTxHash && (
          <a
            href={`https://testnet.bscscan.com/tx/${market.creationTxHash}`}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              window.open(`https://testnet.bscscan.com/tx/${market.creationTxHash}`, '_blank');
            }}
            className="px-2.5 py-1 text-xs font-medium text-purple-600 bg-purple-100 hover:bg-purple-200 rounded-md flex items-center gap-1 transition"
            title="View creation transaction on BSCScan"
          >
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
            <span>TX</span>
          </a>
        )}
      </div>

      {/* Current Price */}
      <div className="mb-4 pb-4 border-b border-gray-100">
        <div className="flex items-baseline justify-between mb-2">
          <span className="text-xs text-gray-500">Current Price</span>
          <span className="text-lg font-bold text-gray-900">
            {(parseFloat(market.currentPrice) * 100).toFixed(2)}%
          </span>
        </div>
        <div className="flex items-baseline justify-between mb-2">
          <span className="text-xs text-gray-500">Total Liquidity</span>
          <span className="text-sm font-semibold text-gray-700">
            {totalLiquidity.toFixed(4)} BNB
          </span>
        </div>
        {market.deadline && market.deadline > 0 && (
          <div className="flex items-baseline justify-between">
            <span className="text-xs text-gray-500 flex items-center gap-1">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {market.state === MarketState.Resolved ? "Resolved" : countdown.expired ? "Expired" : "Time Remaining"}
            </span>
            <span className={`text-sm font-semibold ${countdown.expired ? "text-red-600" : market.state === MarketState.Resolved ? "text-gray-600" : "text-blue-600"}`}>
              {market.state === MarketState.Resolved ? "Resolved" : countdown.expired ? "Expired" : countdown.formatted}
            </span>
          </div>
        )}
      </div>
      
      {/* Betting Buttons - Mobile Optimized */}
      <div className="grid grid-cols-2 gap-2 sm:gap-3" onClick={(e) => e.preventDefault()}>
        <button 
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onBetClick(market, true);
          }}
          disabled={!isActive}
          className="group relative px-3 sm:px-4 py-3 sm:py-3.5 bg-green-50 hover:bg-green-100 active:bg-green-200 rounded-lg transition text-left disabled:opacity-50 disabled:cursor-not-allowed touch-manipulation"
        >
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs sm:text-sm font-semibold text-green-700">YES</span>
            <span className="text-xs sm:text-sm font-medium text-green-600">{yesOdds.toFixed(1)}%</span>
          </div>
          <div className="text-xs text-green-600">
            {parseFloat(market.totalYes).toFixed(2)} BNB
          </div>
          <div className="absolute inset-0 bg-green-500 opacity-0 group-hover:opacity-5 rounded-lg transition"></div>
        </button>
        <button 
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onBetClick(market, false);
          }}
          disabled={!isActive}
          className="group relative px-3 sm:px-4 py-3 sm:py-3.5 bg-red-50 hover:bg-red-100 active:bg-red-200 rounded-lg transition text-left disabled:opacity-50 disabled:cursor-not-allowed touch-manipulation"
        >
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs sm:text-sm font-semibold text-red-700">NO</span>
            <span className="text-xs sm:text-sm font-medium text-red-600">{noOdds.toFixed(1)}%</span>
          </div>
          <div className="text-xs text-red-600">
            {parseFloat(market.totalNo).toFixed(2)} BNB
          </div>
          <div className="absolute inset-0 bg-red-500 opacity-0 group-hover:opacity-5 rounded-lg transition"></div>
        </button>
      </div>
      
      {/* View Details Link */}
      <div className="mt-3 pt-3 border-t border-gray-100">
        <div className="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1">
          View Details
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </div>
      </div>
    </Link>
  );
}

