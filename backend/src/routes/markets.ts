import { Router } from "express";
import { db } from "../db";
import { ethers } from "ethers";
import { z } from "zod";

const router = Router();

const createMarketSchema = z.object({
  question: z.string().min(10),
  category: z.string(),
  duration: z.number().positive(),
  resolutionDelay: z.number().positive(),
  imageUrl: z.string().nullable().optional(),
  oracleType: z.enum(["chainlink", "uma"]).optional().default("chainlink"),
  marketAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/).optional(),
});

// Get all markets
router.get("/", async (req, res) => {
  try {
    const { category, sortBy } = req.query;
    
    let query = "SELECT * FROM markets WHERE 1=1";
    const params: any[] = [];
    let paramIndex = 1;

    // Filter by category if provided
    if (category && category !== "all") {
      query += ` AND category = $${paramIndex}`;
      params.push(category);
      paramIndex++;
    }

    // Sort by different criteria
    if (sortBy === "trending" || sortBy === "liquidity") {
      query += ` ORDER BY total_liquidity DESC, created_at DESC`;
    } else if (sortBy === "category") {
      query += ` ORDER BY category ASC, total_liquidity DESC, created_at DESC`;
    } else {
      // Default: sort by created_at DESC
      query += ` ORDER BY created_at DESC`;
    }

    query += ` LIMIT 100`;

    const result = await db.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error("Error fetching markets:", error);
    res.status(500).json({ error: "Failed to fetch markets" });
  }
});

// Get market by ID
router.get("/:id", async (req, res) => {
  try {
    const result = await db.query(
      "SELECT * FROM markets WHERE market_id = $1",
      [req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Market not found" });
    }
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch market" });
  }
});

// Create market (sync with blockchain)
router.post("/", async (req, res) => {
  try {
    const data = createMarketSchema.parse(req.body);

    // Map oracle type to oracle name and resolution time
    const oracleConfig: Record<string, { name: string; resolutionTime: string }> = {
      chainlink: { name: "Chainlink", resolutionTime: "24 hr" },
      uma: { name: "UMA", resolutionTime: "24-48 hr" },
    };

    const oracleType = data.oracleType || "chainlink";
    const oracle = oracleConfig[oracleType] || oracleConfig["chainlink"];

    // In production, this would interact with the smart contract
    // For now, we'll just store it in the database
    // Get next id value from sequence, then insert with market_id = id
    const nextIdResult = await db.query(`SELECT nextval('markets_id_seq') as next_id`);
    const nextId = nextIdResult.rows[0].next_id;
    
    const result = await db.query(
      `INSERT INTO markets (market_id, question, category, creator_address, end_time, resolution_time, image_url, oracle_type, oracle_name, oracle_resolution_time, market_address)
       VALUES ($1, $2, $3, $4, NOW() + INTERVAL '${data.duration} seconds', NOW() + INTERVAL '${data.duration + data.resolutionDelay} seconds', $5, $6, $7, $8, $9)
       RETURNING id, market_id, market_address, question, category, creator_address, end_time, resolution_time, image_url, oracle_type, oracle_name, oracle_resolution_time, status, outcome, total_liquidity, created_at`,
      [
        nextId, // Use next id value for market_id
        data.question,
        data.category,
        req.body.creatorAddress || "0x0000000000000000000000000000000000000000",
        data.imageUrl || null,
        oracleType, // Store the actual oracle type (chainlink, uma)
        oracle.name,
        oracle.resolutionTime,
        data.marketAddress || null,
      ]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    res.status(500).json({ error: "Failed to create market" });
  }
});

// Get market positions
router.get("/:id/positions", async (req, res) => {
  try {
    const result = await db.query(
      "SELECT * FROM positions WHERE market_id = $1",
      [req.params.id]
    );
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch positions" });
  }
});

// Chat routes
const chatMessageSchema = z.object({
  userAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
  message: z.string().min(1).max(1000),
});

// Get chat messages for a market
router.get("/:id/chat", async (req, res) => {
  try {
    const result = await db.query(
      "SELECT * FROM market_chat_messages WHERE market_id = $1 ORDER BY created_at ASC",
      [req.params.id]
    );
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch chat messages" });
  }
});

// Post a chat message
router.post("/:id/chat", async (req, res) => {
  try {
    const data = chatMessageSchema.parse(req.body);
    const result = await db.query(
      `INSERT INTO market_chat_messages (market_id, user_address, message)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [req.params.id, data.userAddress, data.message]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    res.status(500).json({ error: "Failed to post chat message" });
  }
});

// Info notes routes
const infoNoteSchema = z.object({
  userAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
  title: z.string().min(1).max(255),
  content: z.string().min(1).max(5000),
  linkUrl: z.union([z.string().url(), z.literal("")]).optional(),
});

// Get info notes for a market
router.get("/:id/info", async (req, res) => {
  try {
    const result = await db.query(
      "SELECT * FROM market_info_notes WHERE market_id = $1 ORDER BY created_at DESC",
      [req.params.id]
    );
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch info notes" });
  }
});

// Post an info note
router.post("/:id/info", async (req, res) => {
  try {
    const data = infoNoteSchema.parse(req.body);
    const result = await db.query(
      `INSERT INTO market_info_notes (market_id, user_address, title, content, link_url)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [
        req.params.id,
        data.userAddress,
        data.title,
        data.content,
        data.linkUrl || null,
      ]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    res.status(500).json({ error: "Failed to post info note" });
  }
});

export { router as marketRoutes };

