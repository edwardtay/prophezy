import { db } from "../db";
import dotenv from "dotenv";

dotenv.config();

const mockMarkets = [
  {
    market_id: 1001,
    question: "Will Bitcoin reach $100k by December 31, 2025?",
    category: "Crypto",
    creator_address: "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
    end_time: new Date("2025-12-31T23:59:59Z"),
    resolution_time: new Date("2026-01-01T23:59:59Z"), // +24hr for Chainlink
    status: "active",
    outcome: 0,
    total_liquidity: 12500.50,
  },
  {
    market_id: 1002,
    question: "Will the Lakers win the NBA Championship in 2025?",
    category: "Sports",
    creator_address: "0x8ba1f109551bD432803012645Hac136c22C1779",
    end_time: new Date("2025-06-30T23:59:59Z"), // NBA Finals typically end in June
    resolution_time: new Date("2025-07-01T23:59:59Z"), // +24hr for Chainlink
    status: "active",
    outcome: 0,
    total_liquidity: 15000.75,
  },
  {
    market_id: 1003,
    question: "Will New York City receive more than 50 inches of snow this winter?",
    category: "Weather",
    creator_address: "0x3ddfA8eC3052539b6C9549F194c5D8aE6f6c1961",
    end_time: new Date("2025-03-31T23:59:59Z"), // End of winter
    resolution_time: new Date("2025-04-01T23:59:59Z"), // +24hr for Chainlink
    status: "active",
    outcome: 0,
    total_liquidity: 8500.00,
  },
];

async function seedMarkets() {
  try {
    await db.init();
    console.log("Database connected");

    // Clear existing mock markets (optional - comment out if you want to keep existing)
    await db.query("DELETE FROM markets WHERE market_id IN (1001, 1002, 1003)");
    console.log("Cleared existing mock markets");

    // Insert mock markets
    for (const market of mockMarkets) {
      await db.query(
        `INSERT INTO markets (market_id, question, category, creator_address, end_time, resolution_time, status, outcome, total_liquidity)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         ON CONFLICT (market_id) DO UPDATE SET
           question = EXCLUDED.question,
           category = EXCLUDED.category,
           end_time = EXCLUDED.end_time,
           resolution_time = EXCLUDED.resolution_time,
           status = EXCLUDED.status`,
        [
          market.market_id,
          market.question,
          market.category,
          market.creator_address,
          market.end_time,
          market.resolution_time,
          market.status,
          market.outcome,
          market.total_liquidity,
        ]
      );
      console.log(`✓ Created market ${market.market_id}: ${market.question.substring(0, 50)}...`);
    }

    console.log("\n✅ Successfully seeded 3 mock markets!");
    process.exit(0);
  } catch (error) {
    console.error("Error seeding markets:", error);
    process.exit(1);
  }
}

seedMarkets();


