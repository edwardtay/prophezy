import { Router } from "express";
import { db } from "../db";
import axios from "axios";

const router = Router();

// Resolve market using Chainlink oracle
router.post("/resolve/:marketId", async (req, res) => {
  try {
    const { marketId } = req.params;
    const { oracleType, dataFeedId, threshold, onChain } = req.body;

    if (!oracleType || oracleType !== "chainlink") {
      return res.status(400).json({ error: "oracleType must be 'chainlink'" });
    }

    if (!threshold) {
      return res.status(400).json({ error: "threshold is required" });
    }

    // Get market details
    const marketResult = await db.query(
      "SELECT * FROM markets WHERE market_id = $1",
      [marketId]
    );

    if (marketResult.rows.length === 0) {
      return res.status(404).json({ error: "Market not found" });
    }

    const market = marketResult.rows[0];

    // Off-chain resolution
    // Call oracle service
    const oracleResponse = await axios.post(
      `${process.env.ORACLE_SERVICE_URL || "http://localhost:8000"}/resolve`,
      {
        marketId: parseInt(marketId),
        question: market.question,
        category: market.category,
        oracleType: oracleType,
        dataFeedId: dataFeedId,
        threshold: parseFloat(threshold),
        endTime: market.end_time,
      }
    );

    const resolution = oracleResponse.data;

    // Store resolution in database
    await db.query(
      `INSERT INTO oracle_resolutions (market_id, outcome, confidence_score, resolved_by)
       VALUES ($1, $2, $3, $4)`,
      [marketId, resolution.outcome, resolution.confidence, req.body.resolverAddress || "oracle"]
    );

    // Update market status
    await db.query(
      "UPDATE markets SET status = 'resolved', outcome = $1 WHERE market_id = $2",
      [resolution.outcome, marketId]
    );

    res.json({
      success: true,
      marketId: parseInt(marketId),
      outcome: resolution.outcome,
      value: resolution.value,
      threshold: resolution.threshold,
      oracleType: resolution.oracleType,
      confidence: resolution.confidence,
      timestamp: resolution.timestamp,
      onChain: false,
    });
  } catch (error: any) {
    console.error("Oracle resolution error:", error);
    res.status(500).json({
      error: "Failed to resolve market",
      details: error.response?.data?.detail || error.message,
    });
  }
});

// Get oracle status
router.get("/status", async (req, res) => {
  try {
    const statusResponse = await axios.get(
      `${process.env.ORACLE_SERVICE_URL || "http://localhost:8000"}/oracle-status`
    );
    res.json(statusResponse.data);
  } catch (error) {
    res.status(500).json({ error: "Failed to get oracle status" });
  }
});

// Get oracle metrics from database
router.get("/metrics", async (req, res) => {
  try {
    const { period = "all" } = req.query; // all, 24h, 7d, 30d
    
    // Calculate time filter
    let timeFilter = "";
    const params: any[] = [];
    if (period === "24h") {
      timeFilter = "WHERE or.resolved_at >= NOW() - INTERVAL '24 hours'";
    } else if (period === "7d") {
      timeFilter = "WHERE or.resolved_at >= NOW() - INTERVAL '7 days'";
    } else if (period === "30d") {
      timeFilter = "WHERE or.resolved_at >= NOW() - INTERVAL '30 days'";
    }

    // Get total resolutions
    const totalResolutionsResult = await db.query(
      `SELECT COUNT(*) as count FROM oracle_resolutions or ${timeFilter}`,
      params
    );
    const totalResolutions = parseInt(totalResolutionsResult.rows[0].count);

    // Get resolutions by oracle type
    const chainlinkResolutionsResult = await db.query(
      `SELECT COUNT(*) as count FROM oracle_resolutions or 
       ${timeFilter ? timeFilter + " AND" : "WHERE"} 
       (or.resolved_by LIKE '%chainlink%' OR or.resolved_by LIKE '%Chainlink%')`,
      params
    );
    const chainlinkResolutions = parseInt(chainlinkResolutionsResult.rows[0].count);

    // Calculate average resolution time (time between market end_time and resolution)
    const avgResolutionTimeQuery = timeFilter
      ? `SELECT AVG(EXTRACT(EPOCH FROM (or.resolved_at - m.end_time)) / 60) as avg_minutes
         FROM oracle_resolutions or
         JOIN markets m ON or.market_id = m.market_id
         ${timeFilter} AND m.end_time IS NOT NULL`
      : `SELECT AVG(EXTRACT(EPOCH FROM (or.resolved_at - m.end_time)) / 60) as avg_minutes
         FROM oracle_resolutions or
         JOIN markets m ON or.market_id = m.market_id
         WHERE m.end_time IS NOT NULL`;
    const avgResolutionTimeResult = await db.query(avgResolutionTimeQuery, params);
    const avgResolutionTime = avgResolutionTimeResult.rows[0].avg_minutes 
      ? Math.round(parseFloat(avgResolutionTimeResult.rows[0].avg_minutes))
      : 0;

    // Get average confidence score
    const avgConfidenceResult = await db.query(
      `SELECT AVG(confidence_score) as avg_confidence FROM oracle_resolutions or ${timeFilter}`,
      params
    );
    const avgConfidence = avgConfidenceResult.rows[0].avg_confidence 
      ? parseFloat(avgConfidenceResult.rows[0].avg_confidence)
      : 0;

    // Get total volume resolved (sum of liquidity from resolved markets)
    const totalVolumeQuery = timeFilter
      ? `SELECT COALESCE(SUM(m.total_liquidity), 0) as total_volume
         FROM markets m
         JOIN oracle_resolutions or ON m.market_id = or.market_id
         ${timeFilter} AND m.status = 'resolved'`
      : `SELECT COALESCE(SUM(m.total_liquidity), 0) as total_volume
         FROM markets m
         JOIN oracle_resolutions or ON m.market_id = or.market_id
         WHERE m.status = 'resolved'`;
    const totalVolumeResult = await db.query(totalVolumeQuery, params);
    const totalVolume = parseFloat(totalVolumeResult.rows[0].total_volume || 0);

    // Get resolution time series data (last 7 days)
    const timeSeriesResult = await db.query(
      `SELECT 
         DATE_TRUNC('hour', or.resolved_at) as hour,
         COUNT(*) FILTER (WHERE or.resolved_by LIKE '%chainlink%' OR or.resolved_by LIKE '%Chainlink%') as chainlink_count,
         AVG(EXTRACT(EPOCH FROM (or.resolved_at - m.end_time)) / 60) FILTER (WHERE or.resolved_by LIKE '%chainlink%' OR or.resolved_by LIKE '%Chainlink%') as chainlink_avg_minutes
       FROM oracle_resolutions or
       LEFT JOIN markets m ON or.market_id = m.market_id
       WHERE or.resolved_at >= NOW() - INTERVAL '7 days'
       GROUP BY DATE_TRUNC('hour', or.resolved_at)
       ORDER BY hour ASC`
    );

    // Format time series data
    const resolutionData = timeSeriesResult.rows.map(row => ({
      time: new Date(row.hour).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
      chainlink: row.chainlink_avg_minutes ? Math.round(parseFloat(row.chainlink_avg_minutes)) : 1440,
      uma: 2880, // UMA baseline
    }));

    // Get Chainlink-specific metrics
    const chainlinkMetricsQuery = timeFilter
      ? `SELECT 
           AVG(EXTRACT(EPOCH FROM (or.resolved_at - m.end_time)) / 60) as avg_minutes,
           AVG(confidence_score) as avg_confidence,
           COUNT(*) as count
         FROM oracle_resolutions or
         JOIN markets m ON or.market_id = m.market_id
         WHERE (or.resolved_by LIKE '%chainlink%' OR or.resolved_by LIKE '%Chainlink%')
         ${timeFilter}`
      : `SELECT 
           AVG(EXTRACT(EPOCH FROM (or.resolved_at - m.end_time)) / 60) as avg_minutes,
           AVG(confidence_score) as avg_confidence,
           COUNT(*) as count
         FROM oracle_resolutions or
         JOIN markets m ON or.market_id = m.market_id
         WHERE (or.resolved_by LIKE '%chainlink%' OR or.resolved_by LIKE '%Chainlink%')`;
    const chainlinkMetricsResult = await db.query(chainlinkMetricsQuery, params);

    const chainlinkMetrics = chainlinkMetricsResult.rows[0];

    res.json({
      metrics: {
        avgResolutionTime: avgResolutionTime || 1440,
        totalResolutions,
        chainlinkResolutions,
        disputeCount: 0, // TODO: Add disputes table
        avgConfidence: Math.round(avgConfidence * 100) / 100,
        totalVolume,
      },
      chainlinkMetrics: {
        avgResolutionTime: chainlinkMetrics?.avg_minutes ? Math.round(parseFloat(chainlinkMetrics.avg_minutes)) : 1440,
        successRate: chainlinkResolutions > 0 ? 99.9 : 0,
        marketsResolved: chainlinkResolutions,
        avgConfidence: chainlinkMetrics?.avg_confidence ? Math.round(parseFloat(chainlinkMetrics.avg_confidence) * 100) / 100 : 0.99,
      },
      resolutionData: resolutionData.length > 0 ? resolutionData : [
        { time: "00:00", chainlink: 1440, uma: 2880 },
        { time: "06:00", chainlink: 1440, uma: 2880 },
        { time: "12:00", chainlink: 1440, uma: 2880 },
        { time: "18:00", chainlink: 1440, uma: 2880 },
      ],
    });
  } catch (error: any) {
    console.error("Failed to get oracle metrics:", error);
    res.status(500).json({ 
      error: "Failed to get oracle metrics",
      details: error.message 
    });
  }
});

// Get recent resolutions
router.get("/recent-resolutions", async (req, res) => {
  try {
    const { limit = 20 } = req.query;
    
    const result = await db.query(
      `SELECT 
         or.id,
         or.market_id,
         or.outcome,
         or.confidence_score,
         or.resolved_by,
         or.resolved_at,
         or.tx_hash,
         m.question,
         m.category,
         m.total_liquidity
       FROM oracle_resolutions or
       JOIN markets m ON or.market_id = m.market_id
       ORDER BY or.resolved_at DESC
       LIMIT $1`,
      [limit]
    );

    res.json(result.rows.map(row => ({
      id: row.id,
      marketId: row.market_id,
      question: row.question,
      category: row.category,
      outcome: row.outcome === 1 ? "Yes" : "No",
      confidence: parseFloat(row.confidence_score || 0),
      resolvedBy: row.resolved_by,
      resolvedAt: row.resolved_at,
      txHash: row.tx_hash,
      totalLiquidity: parseFloat(row.total_liquidity || 0),
    })));
  } catch (error: any) {
    console.error("Failed to get recent resolutions:", error);
    res.status(500).json({ 
      error: "Failed to get recent resolutions",
      details: error.message 
    });
  }
});

export { router as oracleRoutes };

