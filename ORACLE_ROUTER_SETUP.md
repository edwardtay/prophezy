# OracleRouter Setup Guide

## Problem
The factory contract requires feedIds to exist in OracleRouter, but feeds need to be registered first.

## Solution
Deploy OracleRouter and register the feeds you want to use.

## Step 1: Deploy OracleRouter

```bash
cd contracts
npx hardhat run scripts/deploy-oracle-router.js --network bnb_testnet
```

This will:
- Deploy OracleRouter contract
- Register common feeds: ETH, BTC, BNB, USDT, USDC
- Set initial prices for each feed

## Step 2: Update Contract Addresses

After deployment, update `frontend/src/lib/contracts.ts`:

```typescript
export const CONTRACT_ADDRESSES = {
  ORACLE_ROUTER: "0x...", // New OracleRouter address
  PREDICTION_MARKET_FACTORY: "0xa7056B7d2d7B97dE9F254C17Ab7E0470E5F112c0",
} as const;
```

## Step 3: Register Additional Feeds (Optional)

If you need to register more feeds, you can call:

```javascript
// In browser console or via script
const oracleRouter = new ethers.Contract(
  ORACLE_ROUTER_ADDRESS,
  [
    "function registerFeed(bytes32 feedId, address priceFeed) external",
    "function updatePrice(bytes32 feedId, uint256 price) external",
  ],
  signer
);

// Register a new feed
const feedId = ethers.encodeBytes32String("YOUR_FEED_NAME");
await oracleRouter.registerFeed(feedId, ethers.ZeroAddress);

// Set initial price (with 8 decimals)
const price = ethers.parseUnits("1000", 8); // $1000
await oracleRouter.updatePrice(feedId, price);
```

## Step 4: Update Prices Regularly

Prices should be updated regularly. You can:

1. **Manual updates** (for testing):
   ```javascript
   const price = ethers.parseUnits("2500", 8); // $2500
   await oracleRouter.updatePrice(feedId, price);
   ```

2. **Automated updates** (production):
   - Set up a backend service to fetch prices from Chainlink/Redstone
   - Call `updatePrice()` periodically
   - Or integrate with Chainlink price feeds by setting `priceFeed` address during registration

## OracleRouter Functions

- `registerFeed(bytes32 feedId, address priceFeed)` - Register a new feed (owner only)
- `updatePrice(bytes32 feedId, uint256 price)` - Update price (owner or priceFeed contract)
- `getPrice(bytes32 feedId)` - Get current price
- `isValidFeed(bytes32 feedId)` - Check if feed exists and is active
- `hasFeed(bytes32 feedId)` - Check if feed exists
- `deactivateFeed(bytes32 feedId)` - Deactivate a feed (owner only)

## Notes

- FeedIds are stored as `bytes32` (use `ethers.encodeBytes32String("ETH")`)
- Prices are stored as `uint256` (use 8 decimals for most cases)
- Only owner can register/deactivate feeds
- Owner or the registered priceFeed contract can update prices



