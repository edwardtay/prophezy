import { Pool } from "pg";
import dotenv from "dotenv";

dotenv.config();

class Database {
  private pool: Pool | null = null;

  async init() {
    this.pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : false,
    });

    // Test connection
    await this.pool.query("SELECT NOW()");
    await this.createTables();
  }

  private async createTables() {
    const createMarketsTable = `
      CREATE TABLE IF NOT EXISTS markets (
        id SERIAL PRIMARY KEY,
        market_id BIGINT UNIQUE NOT NULL,
        question TEXT NOT NULL,
        category VARCHAR(100),
        creator_address VARCHAR(42) NOT NULL,
        end_time TIMESTAMP NOT NULL,
        resolution_time TIMESTAMP,
        status VARCHAR(20) DEFAULT 'active',
        outcome INTEGER DEFAULT 0,
        total_liquidity NUMERIC DEFAULT 0,
        image_url TEXT,
        oracle_type VARCHAR(20),
        oracle_name VARCHAR(50),
        oracle_resolution_time VARCHAR(50),
        created_at TIMESTAMP DEFAULT NOW()
      );
    `;
    
    // Add oracle columns if they don't exist (for existing databases)
    const addOracleColumns = `
      DO $$ 
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='markets' AND column_name='oracle_type') THEN
          ALTER TABLE markets ADD COLUMN oracle_type VARCHAR(20);
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='markets' AND column_name='oracle_name') THEN
          ALTER TABLE markets ADD COLUMN oracle_name VARCHAR(50);
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='markets' AND column_name='oracle_resolution_time') THEN
          ALTER TABLE markets ADD COLUMN oracle_resolution_time VARCHAR(50);
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='markets' AND column_name='feed_id') THEN
          ALTER TABLE markets ADD COLUMN feed_id VARCHAR(66);
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='markets' AND column_name='market_address') THEN
          ALTER TABLE markets ADD COLUMN market_address VARCHAR(42);
        END IF;
      END $$;
    `;

    const createPositionsTable = `
      CREATE TABLE IF NOT EXISTS positions (
        id SERIAL PRIMARY KEY,
        market_id BIGINT NOT NULL,
        user_address VARCHAR(42) NOT NULL,
        side BOOLEAN NOT NULL,
        amount NUMERIC NOT NULL,
        created_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(market_id, user_address, side)
      );
    `;

    const createOracleResolutionsTable = `
      CREATE TABLE IF NOT EXISTS oracle_resolutions (
        id SERIAL PRIMARY KEY,
        market_id BIGINT NOT NULL,
        outcome INTEGER NOT NULL,
        confidence_score NUMERIC,
        ai_analysis TEXT,
        resolved_by VARCHAR(42),
        tx_hash VARCHAR(66),
        resolved_at TIMESTAMP DEFAULT NOW()
      );
    `;
    
    // Add tx_hash column if it doesn't exist (for existing databases)
    const addTxHashColumn = `
      DO $$ 
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='oracle_resolutions' AND column_name='tx_hash') THEN
          ALTER TABLE oracle_resolutions ADD COLUMN tx_hash VARCHAR(66);
        END IF;
      END $$;
    `;

    const createMarketChatTable = `
      CREATE TABLE IF NOT EXISTS market_chat_messages (
        id SERIAL PRIMARY KEY,
        market_id BIGINT NOT NULL,
        user_address VARCHAR(42) NOT NULL,
        message TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_market_chat_market_id ON market_chat_messages(market_id);
      CREATE INDEX IF NOT EXISTS idx_market_chat_created_at ON market_chat_messages(created_at DESC);
    `;

    const createMarketInfoTable = `
      CREATE TABLE IF NOT EXISTS market_info_notes (
        id SERIAL PRIMARY KEY,
        market_id BIGINT NOT NULL,
        user_address VARCHAR(42) NOT NULL,
        title VARCHAR(255) NOT NULL,
        content TEXT NOT NULL,
        link_url VARCHAR(500),
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_market_info_market_id ON market_info_notes(market_id);
      CREATE INDEX IF NOT EXISTS idx_market_info_created_at ON market_info_notes(created_at DESC);
    `;

    if (this.pool) {
      await this.pool.query(createMarketsTable);
      await this.pool.query(addOracleColumns);
      await this.pool.query(createPositionsTable);
      await this.pool.query(createOracleResolutionsTable);
      await this.pool.query(addTxHashColumn);
      await this.pool.query(createMarketChatTable);
      await this.pool.query(createMarketInfoTable);
    }
  }

  getPool() {
    if (!this.pool) {
      throw new Error("Database not initialized");
    }
    return this.pool;
  }

  async query(text: string, params?: any[]) {
    return this.getPool().query(text, params);
  }
}

export const db = new Database();

