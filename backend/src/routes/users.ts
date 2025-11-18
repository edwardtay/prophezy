import { Router } from "express";
import { db } from "../db";
import { getMarketCreatorsOnChain, getPositionsOnChain } from "../services/onchain";

const router = Router();

// Get user positions
router.get("/:address/positions", async (req, res) => {
  try {
    const { address } = req.params;
    const result = await db.query(
      `SELECT p.*, m.question, m.status, m.outcome
       FROM positions p
       JOIN markets m ON p.market_id = m.market_id
       WHERE p.user_address = $1
       ORDER BY p.created_at DESC`,
      [address]
    );
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch user positions" });
  }
});

// Get user stats
router.get("/:address/stats", async (req, res) => {
  try {
    const { address } = req.params;
    const addressLower = address.toLowerCase();

    // Fetch on-chain stats (primary source)
    const [onchainPositions, onchainCreators] = await Promise.all([
      getPositionsOnChain(),
      getMarketCreatorsOnChain(),
    ]);

    const onchainStats = onchainPositions.get(addressLower);
    const marketsCreated = onchainCreators.get(addressLower) || 0;

    // Also fetch from database as fallback/enrichment
    const statsResult = await db.query(
      `WITH bettor_stats AS (
        SELECT 
          p.user_address,
          COUNT(*) as bets_count,
          COALESCE(SUM(p.amount), 0) as total_volume,
          COUNT(*) FILTER (
            WHERE m.status = 'resolved' AND (
              (m.outcome = 1 AND p.side = true) OR
              (m.outcome = 2 AND p.side = false)
            )
          ) as wins,
          COUNT(*) FILTER (WHERE m.status = 'resolved') as resolved_bets
        FROM positions p
        LEFT JOIN markets m ON p.market_id = m.market_id
        WHERE p.user_address = $1
        GROUP BY p.user_address
      )
      SELECT 
        b.user_address,
        COALESCE(b.bets_count, 0) as bets_count,
        COALESCE(b.total_volume, 0) as total_volume,
        COALESCE(b.wins, 0) as wins,
        COALESCE(b.resolved_bets, 0) as resolved_bets,
        CASE 
          WHEN COALESCE(b.resolved_bets, 0) > 0 THEN ROUND((COALESCE(b.wins, 0)::numeric / COALESCE(b.resolved_bets, 0)::numeric) * 100, 2)
          ELSE 0
        END as win_rate
      FROM bettor_stats b`,
      [address]
    );

    const dbStats = statsResult.rows[0];

    // Use on-chain stats as primary, database for wins/resolved (if available)
    if (onchainStats) {
      return res.json({
        address,
        betsCount: onchainStats.betsCount,
        totalVolume: onchainStats.totalVolume,
        wins: dbStats ? parseInt(dbStats.wins || 0) : onchainStats.wins,
        resolvedBets: dbStats ? parseInt(dbStats.resolved_bets || 0) : onchainStats.resolvedBets,
        winRate: dbStats ? parseFloat(dbStats.win_rate || 0) : 
                 (onchainStats.resolvedBets > 0 ? (onchainStats.wins / onchainStats.resolvedBets) * 100 : 0),
        marketsCreated,
      });
    }

    // Fallback to database if no on-chain stats
    if (dbStats) {
      return res.json({
        address: dbStats.user_address || address,
        betsCount: parseInt(dbStats.bets_count || 0),
        totalVolume: parseFloat(dbStats.total_volume || 0),
        wins: parseInt(dbStats.wins || 0),
        resolvedBets: parseInt(dbStats.resolved_bets || 0),
        winRate: parseFloat(dbStats.win_rate || 0),
        marketsCreated,
      });
    }

    // User has no bets, but might have created markets
    return res.json({
      address,
      betsCount: 0,
      totalVolume: 0,
      wins: 0,
      resolvedBets: 0,
      winRate: 0,
      marketsCreated,
    });
  } catch (error: any) {
    console.error("Failed to fetch user stats:", error);
    res.status(500).json({ error: "Failed to fetch user stats", details: error.message });
  }
});

// Get leaderboard
router.get("/leaderboard", async (req, res) => {
  try {
    const { sortBy = "volume", limit = 100 } = req.query;

    // Fetch market creators and positions from on-chain (primary source)
    const [onchainCreators, onchainPositions] = await Promise.all([
      getMarketCreatorsOnChain(),
      getPositionsOnChain(),
    ]);
    console.log(`[leaderboard] Found ${onchainCreators.size} market creators on-chain`);
    console.log(`[leaderboard] Found ${onchainPositions.size} bettors on-chain`);

    // Also fetch from database as fallback/enrichment
    const leaderboardQuery = `
      WITH bettor_stats AS (
        SELECT 
          p.user_address,
          COUNT(*) as bets_count,
          COALESCE(SUM(p.amount), 0) as total_volume,
          COUNT(*) FILTER (
            WHERE m.status = 'resolved' AND (
              (m.outcome = 1 AND p.side = true) OR
              (m.outcome = 2 AND p.side = false)
            )
          ) as wins,
          COUNT(*) FILTER (WHERE m.status = 'resolved') as resolved_bets
        FROM positions p
        LEFT JOIN markets m ON p.market_id = m.market_id
        GROUP BY p.user_address
      ),
      combined_stats AS (
        SELECT 
          b.user_address,
          COALESCE(b.bets_count, 0) as bets_count,
          COALESCE(b.total_volume, 0) as total_volume,
          COALESCE(b.wins, 0) as wins,
          COALESCE(b.resolved_bets, 0) as resolved_bets
        FROM bettor_stats b
      )
      SELECT 
        user_address,
        bets_count,
        total_volume,
        wins,
        resolved_bets,
        CASE 
          WHEN resolved_bets > 0 THEN ROUND((wins::numeric / resolved_bets::numeric) * 100, 2)
          ELSE 0
        END as win_rate
      FROM combined_stats
      WHERE bets_count > 0
    `;

    const dbResult = await db.query(leaderboardQuery);
    const dbStats = new Map<string, any>();
    dbResult.rows.forEach((row) => {
      dbStats.set(row.user_address.toLowerCase(), row);
    });

    // Build leaderboard entries from on-chain data (primary) and database (fallback)
    const leaderboardEntries: any[] = [];
    const processedAddresses = new Set<string>();

    // Add entries from on-chain positions
    for (const [address, onchainStats] of onchainPositions.entries()) {
      const addressLower = address.toLowerCase();
      processedAddresses.add(addressLower);
      
      const dbStatsForUser = dbStats.get(addressLower);
      const onchainMarketsCreated = onchainCreators.get(addressLower) || 0;
      
      // Use on-chain stats as primary, database stats for wins/resolved (if available)
      leaderboardEntries.push({
        address: address,
        betsCount: onchainStats.betsCount,
        totalVolume: onchainStats.totalVolume,
        wins: dbStatsForUser ? parseInt(dbStatsForUser.wins || 0) : onchainStats.wins,
        resolvedBets: dbStatsForUser ? parseInt(dbStatsForUser.resolved_bets || 0) : onchainStats.resolvedBets,
        winRate: dbStatsForUser ? parseFloat(dbStatsForUser.win_rate || 0) : 
                 (onchainStats.resolvedBets > 0 ? (onchainStats.wins / onchainStats.resolvedBets) * 100 : 0),
        marketsCreated: onchainMarketsCreated,
      });
    }

    // Add database-only entries (if any positions exist in DB but not on-chain)
    for (const [addressLower, dbStatsForUser] of dbStats.entries()) {
      if (!processedAddresses.has(addressLower)) {
        const onchainMarketsCreated = onchainCreators.get(addressLower) || 0;
        leaderboardEntries.push({
          address: dbStatsForUser.user_address,
          betsCount: parseInt(dbStatsForUser.bets_count || 0),
          totalVolume: parseFloat(dbStatsForUser.total_volume || 0),
          wins: parseInt(dbStatsForUser.wins || 0),
          resolvedBets: parseInt(dbStatsForUser.resolved_bets || 0),
          winRate: parseFloat(dbStatsForUser.win_rate || 0),
          marketsCreated: onchainMarketsCreated,
        });
        processedAddresses.add(addressLower);
      }
    }

    // Add users who only created markets (not in bettor stats)
    for (const [creatorAddress, marketsCreated] of onchainCreators.entries()) {
      if (!processedAddresses.has(creatorAddress) && marketsCreated > 0) {
        leaderboardEntries.push({
          address: creatorAddress,
          betsCount: 0,
          totalVolume: 0,
          wins: 0,
          resolvedBets: 0,
          winRate: 0,
          marketsCreated: marketsCreated,
        });
      }
    }

    // Sort and rank the combined results
    let sortedEntries = [...leaderboardEntries];
    switch (sortBy) {
      case "bets":
        sortedEntries.sort((a, b) => {
          if (b.betsCount !== a.betsCount) return b.betsCount - a.betsCount;
          if (b.marketsCreated !== a.marketsCreated) return b.marketsCreated - a.marketsCreated;
          return b.totalVolume - a.totalVolume;
        });
        break;
      case "wins":
        sortedEntries.sort((a, b) => {
          if (b.wins !== a.wins) return b.wins - a.wins;
          if (b.winRate !== a.winRate) return b.winRate - a.winRate;
          return b.marketsCreated - a.marketsCreated;
        });
        break;
      case "winrate":
        sortedEntries.sort((a, b) => {
          if (b.winRate !== a.winRate) return b.winRate - a.winRate;
          if (b.wins !== a.wins) return b.wins - a.wins;
          return b.marketsCreated - a.marketsCreated;
        });
        break;
      case "markets":
        sortedEntries.sort((a, b) => {
          if (b.marketsCreated !== a.marketsCreated) return b.marketsCreated - a.marketsCreated;
          if (b.betsCount !== a.betsCount) return b.betsCount - a.betsCount;
          return b.totalVolume - a.totalVolume;
        });
        break;
      case "volume":
      default:
        sortedEntries.sort((a, b) => {
          if (b.totalVolume !== a.totalVolume) return b.totalVolume - a.totalVolume;
          if (b.marketsCreated !== a.marketsCreated) return b.marketsCreated - a.marketsCreated;
          return b.betsCount - a.betsCount;
        });
        break;
    }

    // Apply limit and add ranks
    const limitedEntries = sortedEntries.slice(0, parseInt(limit as string) || 100);
    
    res.json(limitedEntries.map((entry, index) => ({
      rank: index + 1,
      ...entry,
    })));
  } catch (error: any) {
    console.error("Failed to fetch leaderboard:", error);
    res.status(500).json({ 
      error: "Failed to fetch leaderboard",
      details: error.message 
    });
  }
});

export { router as userRoutes };

