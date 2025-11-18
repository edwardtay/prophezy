import express from "express";
import cors from "cors";
import { z } from "zod";

const app = express();
const PORT = process.env.BACKEND_PORT || 3001;

app.use(cors({
  origin: ['https://localhost:3000', 'http://localhost:3000', 'http://localhost:3001'],
  credentials: true,
}));
app.use(express.json());

// In-memory storage (for testing without database)
const markets: any[] = [];
let marketCounter = 1;

const createMarketSchema = z.object({
  question: z.string().min(10),
  category: z.string(),
  duration: z.number().positive(),
  resolutionDelay: z.number().positive(),
  creatorAddress: z.string().optional(),
  oracleType: z.enum(["fast", "secure", "chainlink", "uma"]).optional(),
  imageUrl: z.string().nullable().optional(),
  marketAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/).optional(),
});

// Health check
app.get("/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString(), mode: "mock" });
});

// Get all markets
app.get("/api/markets", (req, res) => {
  res.json(markets);
});

// Get market by ID
app.get("/api/markets/:id", (req, res) => {
  const market = markets.find(m => m.market_id === parseInt(req.params.id));
  if (!market) {
    return res.status(404).json({ error: "Market not found" });
  }
  res.json(market);
});

// Create market
app.post("/api/markets", (req, res) => {
  try {
    console.log("Received request:", JSON.stringify(req.body, null, 2));
    const data = createMarketSchema.parse(req.body);
    
    const now = new Date();
    const endTime = new Date(now.getTime() + data.duration * 1000);
    const resolutionTime = new Date(now.getTime() + (data.duration + data.resolutionDelay) * 1000);
    
    // Determine oracle type: chainlink (24hr) or uma (24-48hr)
    const oracleType = data.oracleType || "chainlink";
    const oracleName = oracleType === "uma" ? "UMA" : "Chainlink";
    const oracleResolutionTime = oracleType === "uma" ? "24-48 hr" : "24 hr";
    
    const market = {
      market_id: marketCounter++,
      question: data.question,
      category: data.category,
      creator_address: data.creatorAddress || "0x0000000000000000000000000000000000000000",
      end_time: endTime.toISOString(),
      resolution_time: resolutionTime.toISOString(),
      status: "active",
      outcome: 0,
      total_liquidity: 0,
      oracle_type: oracleType,
      oracle_name: oracleName,
      oracle_resolution_time: oracleResolutionTime,
      image_url: data.imageUrl || null,
      market_address: data.marketAddress || null,
      created_at: now.toISOString(),
    };
    
    markets.push(market);
    res.status(201).json(market);
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error("Validation error:", error.errors);
      return res.status(400).json({ 
        error: "Validation failed",
        details: error.errors,
        received: req.body
      });
    }
    console.error("Error creating market:", error);
    res.status(500).json({ error: "Failed to create market", details: String(error) });
  }
});

// Get market positions
app.get("/api/markets/:id/positions", (req, res) => {
  const marketId = parseInt(req.params.id);
  // Return empty array - no mock positions
  res.json([]);
});

// Create position (place bet)
app.post("/api/markets/:id/positions", (req, res) => {
  try {
    const marketId = parseInt(req.params.id);
    const { userAddress, side, amount } = req.body;

    if (!userAddress || typeof side !== 'boolean' || !amount || amount <= 0) {
      return res.status(400).json({ error: "Invalid position data" });
    }

    // Find market
    const market = markets.find(m => m.market_id === marketId);
    if (!market) {
      return res.status(404).json({ error: "Market not found" });
    }

    if (market.status !== "active") {
      return res.status(400).json({ error: "Market is not active" });
    }

    // Update market liquidity (simplified - in production would use smart contract)
    market.total_liquidity = (parseFloat(market.total_liquidity || "0") + amount).toString();

    console.log(`Position created: Market ${marketId}, User ${userAddress}, Side: ${side ? 'YES' : 'NO'}, Amount: ${amount} BNB`);

    res.status(201).json({
      market_id: marketId,
      user_address: userAddress,
      side: side,
      amount: amount,
      created_at: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error creating position:", error);
    res.status(500).json({ error: "Failed to create position", details: String(error) });
  }
});

// Challenge oracle resolution
app.post("/api/markets/:id/challenge", (req, res) => {
  try {
    const marketId = parseInt(req.params.id);
    const { reason, challengerAddress } = req.body;

    if (!reason || !reason.trim()) {
      return res.status(400).json({ error: "Challenge reason is required" });
    }

    // Find market
    const market = markets.find(m => m.market_id === marketId);
    if (!market) {
      return res.status(404).json({ error: "Market not found" });
    }

    if (market.status !== "resolved") {
      return res.status(400).json({ error: "Can only challenge resolved markets" });
    }

    console.log(`Oracle challenge submitted: Market ${marketId}, Challenger: ${challengerAddress}, Reason: ${reason}`);

    // In production, this would interact with the dispute resolution smart contract
    res.status(201).json({
      success: true,
      market_id: marketId,
      challenge_id: Math.floor(Math.random() * 1000000),
      challenger: challengerAddress || "0x0000000000000000000000000000000000000000",
      reason: reason,
      status: "pending",
      created_at: new Date().toISOString(),
      message: "Challenge submitted successfully. Dispute resolution process initiated.",
    });
  } catch (error) {
    console.error("Error challenging oracle:", error);
    res.status(500).json({ error: "Failed to submit challenge", details: String(error) });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Mock backend server running on port ${PORT} (no database required)`);
  console.log(`   Health: http://localhost:${PORT}/health`);
  console.log(`   Markets API: http://localhost:${PORT}/api/markets`);
});

