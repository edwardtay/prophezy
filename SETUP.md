# Prophezy Setup Guide

## Prerequisites

- Node.js 18+
- Python 3.10+
- PostgreSQL 14+
- BNB Chain testnet account
- MetaMask or compatible wallet

## Installation

### 1. Clone Repository

```bash
git clone [repository-url]
cd seedify-prediction-2
```

### 2. Install Dependencies

```bash
# Root dependencies
npm install

# Contracts
cd contracts
npm install

# Backend
cd ../backend
npm install

# Frontend
cd ../frontend
npm install

# Oracle service
cd ../oracle
pip install -r requirements.txt
```

### 3. Environment Setup

Create `.env` files:

**Root `.env`**:
```bash
BNB_CHAIN_RPC_URL=https://data-seed-prebsc-1-s1.binance.org:8545
PRIVATE_KEY=your_private_key_here
DATABASE_URL=postgresql://user:password@localhost:5432/prophezy
OPENAI_API_KEY=your_openai_key
ANTHROPIC_API_KEY=your_anthropic_key
```

**Backend `.env`**:
```bash
PORT=3001
DATABASE_URL=postgresql://user:password@localhost:5432/prophezy
ORACLE_SERVICE_URL=http://localhost:8000
```

**Frontend `.env.local`**:
```bash
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXT_PUBLIC_CHAIN_ID=97
```

### 4. Database Setup

```bash
# Create database
createdb prophezy

# Run migrations
cd backend
npm run migrate
```

### 5. Deploy Smart Contracts

```bash
cd contracts

# Compile
npm run compile

# Deploy to BNB Chain testnet
npm run deploy
```

Update contract addresses in backend and frontend configs.

### 6. Start Services

**Terminal 1 - Oracle Service**:
```bash
cd oracle
python main.py
```

**Terminal 2 - Backend**:
```bash
cd backend
npm run dev
```

**Terminal 3 - Frontend**:
```bash
cd frontend
npm run dev
```

### 7. Access Application

- Frontend: http://localhost:3000
- Backend API: http://localhost:3001
- Oracle Service: http://localhost:8000

## Configuration

### Redstone Oracle

✅ **Fully Integrated** - Redstone oracle is now integrated with on-chain resolution support.

1. **Get Redstone API key** (optional, for rate limits):
   - Sign up at https://redstone.finance
   - Get API key from dashboard

2. **Deploy Contracts**:
   ```bash
   cd contracts
   npm run deploy
   ```
   Copy the `REDSTONE_ORACLE_ADDRESS` and `PREDICTION_MARKET_ADDRESS` from output.

3. **Configure Environment Variables**:
   Add to `backend/.env`:
   ```bash
   PREDICTION_MARKET_ADDRESS=<deployed_address>
   REDSTONE_ORACLE_ADDRESS=<deployed_address>
   REDSTONE_API_URL=https://api.redstone.finance
   REDSTONE_API_KEY=your_api_key  # Optional
   ```

4. **Usage**:
   - On-chain resolution: Set `onChain: true` in resolution request
   - Off-chain resolution: Use existing flow (default)
   
   See `REDSTONE_SETUP.md` for detailed integration guide.

### Chainlink Oracle

1. Get Chainlink price feed address for BNB Chain
2. Configure in `contracts/contracts/ChainlinkFallback.sol`
3. Update fallback address in `PredictionMarket` contract

### Privy Account Abstraction

1. Register with Privy at https://privy.io
2. Create a new app and get your App ID
3. Configure in frontend `src/lib/privy.ts`
4. Set `NEXT_PUBLIC_PRIVY_APP_ID` in `.env.local`
5. **IMPORTANT - HTTPS Setup (Required for Privy):**
   - Privy requires HTTPS even for localhost development
   - SSL certificates are already generated in `frontend/` directory
   - If certificates are missing, run:
     ```bash
     cd frontend
     openssl req -x509 -newkey rsa:4096 -nodes \
       -keyout localhost-key.pem -out localhost.pem -days 365 \
       -subj "/CN=localhost" \
       -addext "subjectAltName=DNS:localhost,DNS:*.localhost,IP:127.0.0.1,IP:::1"
     ```
6. **IMPORTANT**: Add `https://localhost:3000` to Allowed Origins in Privy Dashboard:
   - Go to https://dashboard.privy.io
   - Select your app → Configuration → App settings → Domains tab
   - Add `https://localhost:3000` to "Allowed Origins" (note: HTTPS, not HTTP)
   - You may also want to add `http://localhost:3000` for fallback

## Testing

```bash
# Contracts
cd contracts
npm run test

# Backend
cd ../backend
npm run test

# Frontend
cd ../frontend
npm run test
```

## Troubleshooting

### Database Connection Issues
- Check PostgreSQL is running
- Verify DATABASE_URL in .env
- Check database exists

### Contract Deployment Issues
- Verify BNB Chain RPC URL
- Check private key has testnet BNB
- Verify network in hardhat.config.js

### Frontend Connection Issues
- Check backend is running
- Verify API URL in .env.local
- Check CORS settings in backend

## Production Deployment

### Backend
- Use environment variables for all secrets
- Enable HTTPS
- Set up database backups
- Configure rate limiting

### Frontend
- Build: `npm run build`
- Deploy to Vercel/Netlify
- Configure environment variables

### Contracts
- Deploy to BNB Chain mainnet
- Verify contracts on BSCScan
- Update frontend with mainnet addresses

