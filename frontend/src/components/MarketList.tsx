"use client";

import { useState, useMemo, useEffect } from "react";
import { usePathname, useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useMarkets } from "../hooks/useMarkets";
import { MarketData, MarketState } from "../lib/contracts";
import BetModal from "./BetModal";
import MarketDetail, { MarketRow } from "./MarketDetail";
import MarketCard from "./MarketCard";
import axios from "axios";


type SortOption = "trending" | "newest" | "oldest";

export default function MarketList() {
  const { markets, loading, error, refetch } = useMarkets();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  
  // Refetch markets when there's a refresh query parameter (e.g., after creating a market)
  useEffect(() => {
    const refreshParam = searchParams?.get("refresh");
    if (refreshParam === "true" && pathname === "/") {
      // Small delay to ensure transaction is mined and backend is updated
      const timer = setTimeout(() => {
        refetch();
        // Remove the refresh parameter from URL after refetching
        if (typeof window !== "undefined") {
          const url = new URL(window.location.href);
          url.searchParams.delete("refresh");
          window.history.replaceState({}, "", url.pathname);
        }
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [pathname, searchParams, refetch]);

  // Auto-refresh markets every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      refetch();
    }, 30000); // 30 seconds

    return () => clearInterval(interval);
  }, [refetch]);
  const [selectedMarket, setSelectedMarket] = useState<MarketData | null>(null);
  const [betSide, setBetSide] = useState<boolean | null>(null);
  const [detailMarket, setDetailMarket] = useState<MarketRow | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [sortBy, setSortBy] = useState<SortOption>("trending");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Use only real markets
  const allMarkets = useMemo(() => {
    if (loading) {
      return [];
    }
    return markets;
  }, [markets, loading]);

  // Extract unique categories from markets
  const categories = useMemo(() => {
    const cats = new Set<string>();
    allMarkets.forEach((market) => {
      if (market.category) {
        cats.add(market.category);
      }
    });
    return Array.from(cats).sort();
  }, [allMarkets]);

  // Filter and sort markets
  const filteredAndSortedMarkets = useMemo(() => {
    let filtered = allMarkets;

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((market) => {
        const question = market.question?.toLowerCase() || "";
        const category = market.category?.toLowerCase() || "";
        const feedId = market.feedId?.toLowerCase() || "";
        return question.includes(query) || category.includes(query) || feedId.includes(query);
      });
    }

    // Filter by category
    if (selectedCategory !== "all") {
      filtered = filtered.filter(
        (market) => market.category === selectedCategory
      );
    }

    // Sort markets
    const sorted = [...filtered].sort((a, b) => {
      if (sortBy === "trending") {
        const scoreA = a.trendingScore || 0;
        const scoreB = b.trendingScore || 0;
        return scoreB - scoreA; // Descending: highest trending first
      } else if (sortBy === "newest") {
        // Sort by creation time (newest first)
        const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        // If no createdAt, use creationTxHash as fallback (newer transactions = newer markets)
        if (timeA === 0 && timeB === 0) {
          // Fallback: markets without timestamps go to end
          return 0;
        }
        return timeB - timeA; // Descending: newest first
      } else if (sortBy === "oldest") {
        // Sort by creation time (oldest first)
        const timeA = a.createdAt ? new Date(a.createdAt).getTime() : Number.MAX_SAFE_INTEGER;
        const timeB = b.createdAt ? new Date(b.createdAt).getTime() : Number.MAX_SAFE_INTEGER;
        return timeA - timeB; // Ascending: oldest first
      }
      return 0;
    });

    return sorted;
  }, [allMarkets, selectedCategory, sortBy, searchQuery]);

  // Calculate odds from market data
  const calculateOdds = (market: MarketData, side: boolean) => {
    const totalYes = parseFloat(market.totalYes);
    const totalNo = parseFloat(market.totalNo);
    const total = totalYes + totalNo;
    
    if (total === 0) return 50;
    
    if (side) {
      return (totalYes / total) * 100;
    } else {
      return (totalNo / total) * 100;
    }
  };

  const getStatusText = (state: MarketState) => {
    switch (state) {
      case MarketState.Active:
        return "Active";
      case MarketState.Locked:
        return "Locked";
      case MarketState.Resolved:
        return "Resolved";
      default:
        return "Unknown";
    }
  };

  const getStatusColor = (state: MarketState) => {
    switch (state) {
      case MarketState.Active:
        return "bg-green-100 text-green-700";
      case MarketState.Locked:
        return "bg-yellow-100 text-yellow-700";
      case MarketState.Resolved:
        return "bg-gray-100 text-gray-600";
      default:
        return "bg-gray-100 text-gray-600";
    }
  };

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
        <p className="mt-4 text-gray-500">Loading markets from blockchain...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-red-600 mb-4">Error: {error}</p>
        <button
          onClick={refetch}
          className="px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-4 sm:mb-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-1 sm:mb-2">Markets</h2>
            <p className="text-xs sm:text-sm text-gray-500">Predict on real-world events</p>
          </div>
          <button
            onClick={refetch}
            className="px-3 sm:px-4 py-2 text-xs sm:text-sm bg-gray-100 hover:bg-gray-200 rounded-lg transition self-start sm:self-auto"
          >
            Refresh
          </button>
        </div>
        
        {/* Search Bar */}
        <div className="relative">
          <input
            type="text"
            placeholder="Search markets by question, category, or feed..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-4 py-2 pl-10 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
          />
          <svg
            className="absolute left-3 top-2.5 h-5 w-5 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Filter and Sort Controls */}
      {allMarkets.length > 0 && (
        <div className="mb-4 sm:mb-6 flex flex-col sm:flex-row gap-3">
          {/* Category Filter */}
          <div className="flex-1">
            <label className="block text-xs font-medium text-gray-700 mb-1.5">
              Category
            </label>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Categories</option>
              {categories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          {/* Sort By */}
          <div className="flex-1">
            <label className="block text-xs font-medium text-gray-700 mb-1.5">
              Sort By
            </label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortOption)}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="trending">🔥 Trending</option>
              <option value="newest">🆕 Newest</option>
              <option value="oldest">⏰ Oldest</option>
            </select>
          </div>
        </div>
      )}
      
      {allMarkets.length === 0 ? (
        <div className="text-center py-16">
          <div className="text-gray-400 mb-4">
            <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <p className="text-gray-500 mb-2">No markets yet</p>
          <p className="text-sm text-gray-400">Create the first prediction market!</p>
        </div>
      ) : filteredAndSortedMarkets.length === 0 ? (
        <div className="text-center py-16">
          <div className="text-gray-400 mb-4">
            <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <p className="text-gray-500 mb-2">No markets found</p>
          <p className="text-sm text-gray-400">
            {selectedCategory !== "all" 
              ? `No markets in category "${selectedCategory}"`
              : "Try adjusting your filters"}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredAndSortedMarkets.map((market) => (
            <MarketCard
              key={market.address}
              market={market}
              sortBy={sortBy}
              onBetClick={(m, side) => {
                setSelectedMarket(m);
                setBetSide(side);
              }}
              getStatusColor={getStatusColor}
              getStatusText={getStatusText}
              calculateOdds={calculateOdds}
            />
          ))}
        </div>
      )}

      {/* Bet Modal */}
      {selectedMarket && betSide !== null && (
        <BetModal
          market={selectedMarket}
          side={betSide}
          onClose={() => {
            setSelectedMarket(null);
            setBetSide(null);
          }}
          onSuccess={() => {
            refetch(); // Refresh markets after bet
          }}
        />
      )}

      {/* Market Detail Modal */}
      {detailMarket && (
        <MarketDetail
          market={detailMarket}
          onClose={() => {
            setDetailMarket(null);
            refetch(); // Refresh to get latest data
          }}
        />
      )}
    </div>
  );
}

