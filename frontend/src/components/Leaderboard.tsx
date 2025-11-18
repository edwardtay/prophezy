"use client";

import { useState, useEffect } from "react";
import axios from "axios";
import { usePrivy } from "@privy-io/react-auth";

// Use relative routes for same-origin (local dev), or absolute URL for separate backend
const API_BASE = process.env.NEXT_PUBLIC_API_URL || "";

interface LeaderboardEntry {
  rank: number;
  address: string;
  betsCount: number;
  totalVolume: number;
  wins: number;
  resolvedBets: number;
  winRate: number;
  marketsCreated?: number;
}

export default function Leaderboard() {
  const { user, ready, authenticated } = usePrivy();
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [userStats, setUserStats] = useState<LeaderboardEntry | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<"volume" | "bets" | "wins" | "winrate" | "markets">("volume");

  const getWalletAddress = () => {
    if (!ready || !authenticated || !user) return null;
    return (
      user?.wallet?.address ||
      user?.wallet?.addresses?.[0] ||
      user?.linkedAccounts?.find((acc: any) => acc.type === "wallet")?.address
    );
  };

  const fetchLeaderboard = async () => {
    try {
      setError(null);
      const response = await axios.get(`${API_BASE}/api/users/leaderboard`, {
        params: { sortBy, limit: 100 },
      });
      setLeaderboard(response.data);
    } catch (err: any) {
      console.error("Failed to fetch leaderboard:", err);
      // Silently fail - don't show error to user
      setError(null);
    } finally {
      setLoading(false);
    }
  };

  const fetchUserStats = async (address: string) => {
    try {
      const response = await axios.get(`${API_BASE}/api/users/${address}/stats`);
      const stats = response.data;
      
      // Check if user is already in leaderboard
      const inLeaderboard = leaderboard.find(
        (entry) => entry.address.toLowerCase() === address.toLowerCase()
      );
      
      // If user is in leaderboard, don't show separate card (they're highlighted in table)
      if (inLeaderboard) {
        setUserStats(null);
        return;
      }
      
      // Only proceed if user has stats (bets or markets created)
      if (stats.betsCount === 0 && (!stats.marketsCreated || stats.marketsCreated === 0)) {
        setUserStats(null);
        return;
      }
      
      // Calculate approximate rank by checking how many have better stats
      let rank = 101; // Default to >100 if not in top 100
      const userValue = getSortValue(stats, sortBy);
      
      // Find the first position where user would fit (userValue >= entryValue)
      for (let i = 0; i < leaderboard.length; i++) {
        const entryValue = getSortValue(leaderboard[i], sortBy);
        // For descending order: if userValue >= entryValue, user should be at rank i+1
        if (userValue >= entryValue) {
          rank = i + 1;
          break;
        }
      }
      
        setUserStats({
          rank,
          address: stats.address,
          betsCount: stats.betsCount,
          totalVolume: stats.totalVolume,
          wins: stats.wins,
          resolvedBets: stats.resolvedBets,
          winRate: stats.winRate,
          marketsCreated: stats.marketsCreated || 0,
        });
    } catch (err: any) {
      console.error("Failed to fetch user stats:", err);
      // Don't set error for user stats, just log it
      setUserStats(null);
    }
  };

  const getSortValue = (entry: LeaderboardEntry, sort: string): number => {
    switch (sort) {
      case "bets":
        return entry.betsCount;
      case "wins":
        return entry.wins;
      case "winrate":
        return entry.winRate;
      case "markets":
        return entry.marketsCreated || 0;
      case "volume":
      default:
        return entry.totalVolume;
    }
  };

  useEffect(() => {
    fetchLeaderboard();
  }, [sortBy]);

  useEffect(() => {
    if (leaderboard.length > 0 && ready && authenticated) {
      const walletAddress = getWalletAddress();
      if (walletAddress) {
        fetchUserStats(walletAddress);
      } else {
        setUserStats(null);
      }
    }
  }, [leaderboard, ready, authenticated, user, sortBy]);

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const formatVolume = (volume: number) => {
    if (volume >= 1000000) return `${(volume / 1000000).toFixed(2)}M`;
    if (volume >= 1000) return `${(volume / 1000).toFixed(2)}K`;
    return volume.toFixed(4);
  };

  const getRankBadge = (rank: number) => {
    if (rank === 1) return "🥇";
    if (rank === 2) return "🥈";
    if (rank === 3) return "🥉";
    return `#${rank}`;
  };

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
        <p className="mt-4 text-gray-500">Loading leaderboard...</p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6 flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Leaderboard</h2>
        </div>
        <div className="flex gap-2">
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as "volume" | "bets" | "wins" | "winrate" | "markets")}
            className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
          >
            <option value="volume">Sort by Volume</option>
            <option value="bets">Sort by Bets</option>
            <option value="wins">Sort by Wins</option>
            <option value="winrate">Sort by Win Rate</option>
            <option value="markets">Sort by Markets Created</option>
          </select>
          <button
            onClick={() => {
              setLoading(true);
              fetchLeaderboard();
            }}
            className="px-4 py-1.5 text-sm bg-black text-white rounded-lg hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-black"
            disabled={loading}
          >
            {loading ? "Refreshing..." : "Refresh"}
          </button>
        </div>
      </div>


      {/* User's Stats Card - Show if connected and not in top 100 */}
      {userStats && (
        <div className="mb-6 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border-2 border-blue-300 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-gray-900">Your Stats</h3>
            <span className="text-sm font-medium text-blue-700 bg-blue-100 px-3 py-1 rounded-full">
              {userStats.rank > 100 ? "Rank >100" : `Rank #${userStats.rank}`}
            </span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div>
              <p className="text-xs text-gray-600 mb-1">Address</p>
              <p className="font-mono text-sm font-semibold text-gray-900">
                {formatAddress(userStats.address)}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-600 mb-1">Total Volume</p>
              <p className="text-sm font-semibold text-gray-900">
                {formatVolume(userStats.totalVolume)} BNB
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-600 mb-1">Bets</p>
              <p className="text-sm font-semibold text-gray-900">{userStats.betsCount}</p>
            </div>
            <div>
              <p className="text-xs text-gray-600 mb-1">Win Rate</p>
              <p
                className={`text-sm font-semibold ${
                  userStats.winRate >= 60
                    ? "text-green-600"
                    : userStats.winRate >= 40
                    ? "text-yellow-600"
                    : "text-gray-600"
                }`}
              >
                {userStats.winRate.toFixed(1)}%
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-600 mb-1">Markets Created</p>
              <p className="text-sm font-semibold text-gray-900">
                {userStats.marketsCreated || 0}
              </p>
            </div>
          </div>
        </div>
      )}

      {leaderboard.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <p className="text-gray-500">No leaderboard data yet. Start betting to appear on the leaderboard!</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase tracking-wider">Rank</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase tracking-wider">Address</th>
                  <th className="text-right py-3 px-4 text-xs font-semibold text-gray-600 uppercase tracking-wider">Total Volume</th>
                  <th className="text-right py-3 px-4 text-xs font-semibold text-gray-600 uppercase tracking-wider">Bets</th>
                  <th className="text-right py-3 px-4 text-xs font-semibold text-gray-600 uppercase tracking-wider">Wins</th>
                  <th className="text-right py-3 px-4 text-xs font-semibold text-gray-600 uppercase tracking-wider">Win Rate</th>
                  <th className="text-right py-3 px-4 text-xs font-semibold text-gray-600 uppercase tracking-wider">Markets Created</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {leaderboard.map((entry) => {
                  const walletAddress = getWalletAddress();
                  const isCurrentUser = walletAddress && 
                    entry.address.toLowerCase() === walletAddress.toLowerCase();
                  return (
                  <tr
                    key={entry.address}
                    className={`hover:bg-gray-50 transition ${
                      entry.rank <= 3 ? "bg-yellow-50/30" : ""
                    } ${
                      isCurrentUser ? "bg-blue-50 border-l-4 border-l-blue-500" : ""
                    }`}
                  >
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-2">
                        <span className="text-lg font-bold text-gray-900">
                          {getRankBadge(entry.rank)}
                        </span>
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm font-medium text-gray-900">
                          {formatAddress(entry.address)}
                        </span>
                        {isCurrentUser && (
                          <span className="text-xs font-medium text-blue-700 bg-blue-100 px-2 py-0.5 rounded">
                            You
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-4 px-4 text-right">
                      <span className="text-sm font-semibold text-gray-900">
                        {formatVolume(entry.totalVolume)} BNB
                      </span>
                    </td>
                    <td className="py-4 px-4 text-right">
                      <span className="text-sm text-gray-700">{entry.betsCount}</span>
                    </td>
                    <td className="py-4 px-4 text-right">
                      <span className="text-sm font-medium text-gray-900">{entry.wins}</span>
                    </td>
                    <td className="py-4 px-4 text-right">
                      <span
                        className={`text-sm font-semibold ${
                          entry.winRate >= 60
                            ? "text-green-600"
                            : entry.winRate >= 40
                            ? "text-yellow-600"
                            : "text-gray-600"
                        }`}
                      >
                        {entry.winRate.toFixed(1)}%
                      </span>
                    </td>
                    <td className="py-4 px-4 text-right">
                      <span className="text-sm font-medium text-gray-900">
                        {entry.marketsCreated || 0}
                      </span>
                    </td>
                  </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Top 3 Highlight Cards */}
      {leaderboard.length >= 3 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
          {leaderboard.slice(0, 3).map((entry, index) => (
            <div
              key={entry.address}
              className={`bg-white rounded-xl border-2 p-6 ${
                index === 0
                  ? "border-yellow-400 bg-gradient-to-br from-yellow-50 to-white"
                  : index === 1
                  ? "border-gray-300 bg-gradient-to-br from-gray-50 to-white"
                  : "border-orange-300 bg-gradient-to-br from-orange-50 to-white"
              }`}
            >
              <div className="flex items-center justify-between mb-4">
                <span className="text-4xl">{getRankBadge(entry.rank)}</span>
                <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {index === 0 ? "Champion" : index === 1 ? "Runner-up" : "Third Place"}
                </span>
              </div>
              <div className="space-y-2">
                <div>
                  <p className="text-xs text-gray-500 mb-1">Address</p>
                  <p className="font-mono text-sm font-semibold text-gray-900">
                    {formatAddress(entry.address)}
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-3 pt-2 border-t border-gray-200">
                  <div>
                    <p className="text-xs text-gray-500">Volume</p>
                    <p className="text-sm font-semibold text-gray-900">
                      {formatVolume(entry.totalVolume)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Win Rate</p>
                    <p className="text-sm font-semibold text-green-600">
                      {entry.winRate.toFixed(1)}%
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

