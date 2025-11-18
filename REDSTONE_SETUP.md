# Redstone Oracle Integration - Setup Guide

## ✅ Integration Complete

The Redstone oracle has been fully integrated into the Prophezy prediction market system. This enables **on-chain, trustless market resolution** using Redstone's fast oracle (15 minutes vs 24-48 hours for traditional oracles).

## What Was Implemented

### 1. Smart Contracts
- ✅ **RedstoneOracle.sol**: Updated to use Redstone's `RedstoneConsumerNumericBase` contract
- ✅ **PredictionMarket.sol**: Updated to work with RedstoneOracle
- ✅ Contracts compile successfully

### 2. Backend Integration
- ✅ **Redstone Service** (`backend/src/services/redstone.ts`): 
  - Fetches prices from Redstone API
  - Prepares on-chain transactions
  - Calls smart contracts for resolution
- ✅ **Oracle Route** (`backend/src/routes/oracle.ts`): 
  - Supports both on-chain and off-chain resolution
  - Use `onChain: true` flag for trustless resolution

### 3. Deployment
- ✅ **Deployment Script** (`contracts/scripts/deploy.js`): 
  - Deploys RedstoneOracle contract
  - Sets up proper authorization
  - Outputs contract addresses

## Environment Variables

Add these to your `.env` files:

### Backend `.env`
```bash
# Blockchain Configuration
BNB_CHAIN_RPC_URL=https://data-seed-prebsc-1-s1.binance.org:8545
PRIVATE_KEY=your_private_key_here
PREDICTION_MARKET_ADDRESS=0x...  # Set after deployment
REDSTONE_ORACLE_ADDRESS=0x...    # Set after deployment

# Redstone Configuration
REDSTONE_API_URL=https://api.redstone.finance
REDSTONE_API_KEY=your_api_key  # Optional, for rate limits
```

### Root `.env`
```bash
BNB_CHAIN_RPC_URL=https://data-seed-prebsc-1-s1.binance.org:8545
PRIVATE_KEY=your_private_key_here
```

## Deployment Steps

1. **Deploy Contracts**:
```bash
cd contracts
npm run deploy
```

2. **Copy Contract Addresses**:
After deployment, copy the addresses from the output and add to backend `.env`:
```
PREDICTION_MARKET_ADDRESS=<deployed_address>
REDSTONE_ORACLE_ADDRESS=<deployed_address>
```

3. **Authorize Oracle Resolver**:
The deployment script automatically authorizes the PredictionMarket contract to use RedstoneOracle.

## Usage

### On-Chain Resolution (Trustless)

```bash
POST /api/oracle/resolve/:marketId
{
  "oracleType": "redstone",
  "dataFeedId": "ETH",  # Redstone data feed symbol
  "threshold": 2500,    # Threshold value
  "onChain": true       # Enable on-chain resolution
}
```

### Off-Chain Resolution (Current Flow)

```bash
POST /api/oracle/resolve/:marketId
{
  "oracleType": "redstone",
  "dataFeedId": "ETH",
  "threshold": 2500,
  "onChain": false  # or omit this field
}
```

## How It Works

### Redstone Pull Model

1. **Backend** fetches price from Redstone API
2. **Backend** prepares transaction with Redstone calldata (signed price data)
3. **Smart Contract** extracts price from calldata using Redstone's library
4. **Market** is resolved on-chain based on threshold comparison

### Key Differences from Chainlink

| Aspect | Chainlink | Redstone |
|--------|-----------|----------|
| Model | Push (data stored on-chain) | Pull (data in calldata) |
| Gas Cost | Higher | Lower |
| Update Speed | Slower | Faster (15 mins) |
| Trust Model | Decentralized network | Multi-source aggregation |

## Security Notes

⚠️ **Current Implementation**: The `getAuthorisedSignerIndex()` function is simplified for development. 

**For Production**:
1. Implement proper signer management
2. Maintain a mapping of authorized Redstone signers
3. Set appropriate `getUniqueSignersThreshold()` (recommended: 3+ signers)
4. Validate timestamps strictly

## Testing

1. **Compile Contracts**:
```bash
cd contracts
npm run compile
```

2. **Test Backend Service**:
```bash
cd backend
npm run dev
```

3. **Test Resolution**:
```bash
curl -X POST http://localhost:3001/api/oracle/resolve/1 \
  -H "Content-Type: application/json" \
  -d '{
    "oracleType": "redstone",
    "dataFeedId": "ETH",
    "threshold": 2500,
    "onChain": true
  }'
```

## Available Redstone Data Feeds

Common data feeds available:
- `ETH` - Ethereum price
- `BTC` - Bitcoin price
- `BNB` - Binance Coin price
- `USDC` - USD Coin price
- And 1,250+ other assets

See: https://docs.redstone.finance/docs/smart-contract-devs/data-feeds

## Troubleshooting

### Contract Compilation Errors
- Ensure `@redstone-finance/evm-connector` is installed: `npm install`
- Check Solidity version compatibility (0.8.20)

### On-Chain Resolution Fails
- Verify `PRIVATE_KEY` and `PREDICTION_MARKET_ADDRESS` are set
- Check RPC URL is correct and accessible
- Ensure market has ended (`endTime` passed)
- Verify oracle is authorized in PredictionMarket contract

### Redstone API Errors
- Check `REDSTONE_API_URL` is correct
- Verify `dataFeedId` exists in Redstone's data feeds
- Check API key if rate limited

## Next Steps

1. ✅ Deploy contracts to testnet
2. ✅ Test on-chain resolution
3. ⏳ Implement proper signer management for production
4. ⏳ Add comprehensive tests
5. ⏳ Deploy to mainnet

## Resources

- Redstone Docs: https://docs.redstone.finance/
- Redstone SDK: https://www.npmjs.com/package/@redstone-finance/evm-connector
- Redstone Data Feeds: https://docs.redstone.finance/docs/smart-contract-devs/data-feeds



