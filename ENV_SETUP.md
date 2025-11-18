# Environment Variables Setup Guide

This guide explains how to set up environment variables for Prophezy.

## Quick Start

1. Copy the example files to actual `.env` files:
   ```bash
   cp .env.example .env
   cp backend/.env.example backend/.env
   cp frontend/.env.local.example frontend/.env.local
   cp contracts/.env.example contracts/.env
   cp oracle/.env.example oracle/.env
   ```

2. Fill in your actual values in each `.env` file

## Environment Files by Component

### Root `.env`
Used for general configuration and shared variables.

**Required:**
- `DATABASE_URL` - PostgreSQL connection string
- `BNB_CHAIN_RPC_URL` - BNB Chain RPC endpoint
- `PRIVATE_KEY` - Wallet private key (for contract deployment)

**Optional:**
- `OPENAI_API_KEY` / `ANTHROPIC_API_KEY` - For AI oracle features
- `PRIVY_API_KEY` - For Account Abstraction

### Backend `.env`
Backend API server configuration.

**Required:**
- `DATABASE_URL` - PostgreSQL connection string
- `PORT` - Backend server port (default: 3001)

**Optional:**
- `ORACLE_SERVICE_URL` - Oracle service endpoint
- Contract addresses (after deployment)

### Frontend `.env.local`
Next.js frontend configuration.

**Required:**
- `NEXT_PUBLIC_API_URL` - Backend API URL
- `NEXT_PUBLIC_CHAIN_ID` - BNB Chain ID (97 for testnet, 56 for mainnet)
- `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` - WalletConnect project ID

**Optional:**
- Contract addresses (after deployment)
- Privy Finance configuration

### Contracts `.env`
Smart contract deployment configuration.

**Required:**
- `BNB_CHAIN_RPC_URL` - BNB Chain RPC endpoint
- `PRIVATE_KEY` - Wallet private key for deployment

**Optional:**
- `BSCSCAN_API_KEY` - For contract verification
- `CHAINLINK_FEED_ADDRESS` - Chainlink price feed address

### Oracle `.env`
AI Oracle service configuration.

**Required (at least one):**
- `OPENAI_API_KEY` OR `ANTHROPIC_API_KEY` - For AI analysis

**Optional:**
- `REDSTONE_API_KEY` - For Redstone oracle integration
- `DATABASE_URL` - For storing resolution history

## Getting API Keys

### WalletConnect Project ID
1. Go to https://cloud.walletconnect.com
2. Create a new project
3. Copy the Project ID

### OpenAI API Key
1. Go to https://platform.openai.com/api-keys
2. Create a new API key
3. Copy the key (starts with `sk-`)

### Anthropic API Key
1. Go to https://console.anthropic.com/
2. Navigate to API Keys
3. Create a new key
4. Copy the key

### BSCScan API Key
1. Go to https://bscscan.com/myapikey
2. Create a new API key
3. Copy the key

### Redstone API Key
1. Go to https://redstone.finance/
2. Sign up and get API access
3. Copy the API key

### Privy
1. Go to https://privy.io
2. Sign up and create a new app
3. Get your App ID from the dashboard
4. Configure login methods (email, Google, Twitter, Discord, wallet)

## Security Notes

⚠️ **IMPORTANT:**
- Never commit `.env` files to git (they're in `.gitignore`)
- Never share your private keys
- Use test accounts for development
- Use environment-specific keys for production
- Rotate keys regularly

## Testing Configuration

For local development, you can use these test values:

```bash
# .env (root)
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/prophezy
BNB_CHAIN_RPC_URL=https://data-seed-prebsc-1-s1.binance.org:8545
PRIVATE_KEY=0000000000000000000000000000000000000000000000000000000000000000

# frontend/.env.local
NEXT_PUBLIC_CHAIN_ID=97
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=test-project-id
```

## Production Configuration

For production deployment:

1. Use environment variables from your hosting provider
2. Use mainnet RPC URLs
3. Use production database
4. Set `NODE_ENV=production`
5. Use secure key management (AWS Secrets Manager, etc.)

## Troubleshooting

### Database Connection Issues
- Check PostgreSQL is running: `pg_isready`
- Verify connection string format
- Check database exists: `psql -l | grep prophezy`

### Contract Deployment Issues
- Verify private key has testnet BNB
- Check RPC URL is accessible
- Ensure private key format (no 0x prefix)

### Frontend Connection Issues
- Verify backend is running on correct port
- Check CORS settings in backend
- Verify WalletConnect project ID is valid

