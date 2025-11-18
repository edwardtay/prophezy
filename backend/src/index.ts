import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { marketRoutes } from "./routes/markets";
import { oracleRoutes } from "./routes/oracle";
import { userRoutes } from "./routes/users";
import { db } from "./db";

dotenv.config();

const app = express();
const PORT = process.env.PORT || process.env.BACKEND_PORT || 3001;

// CORS configuration - allow Vercel and localhost
app.use(cors({
  origin: process.env.CORS_ORIGIN 
    ? process.env.CORS_ORIGIN.split(',')
    : ['http://localhost:3000', 'https://localhost:3000'],
  credentials: true,
}));
app.use(express.json());

// Routes
app.use("/api/markets", marketRoutes);
app.use("/api/oracle", oracleRoutes);
app.use("/api/users", userRoutes);

// Health check
app.get("/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Initialize database and start server
async function start() {
  try {
    await db.init();
    console.log("Database connected");

    app.listen(PORT, () => {
      console.log(`Backend server running on port ${PORT}`);
    });
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
}

start();



