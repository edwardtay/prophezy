# Deployment Guide - OracleRouter & Feed Registration

## Problem
The factory contract requires feedIds to exist in OracleRouter before creating markets. You need to:
1. Deploy OracleRouter (or use existing one)
2. Register feedIds (BNB, ETH, BTC, etc.)
3. Set initial prices

## Quick Start - Register Feeds in Existing OracleRouter

If you already have OracleRouter deployed at `0xcff09905f8f18b35f5a1ba6d2822d62b3d8c48be`:

```bash
cd contracts
npx hardhat run scripts/register-feeds.js --network bnb_testnet
```

This will register: ETH, BTC, BNB, USDT, USDC with initial prices.

## Full Deployment - Deploy New OracleRouter

### Step 1: Deploy OracleRouter

```bash
cd contracts
npx hardhat run scripts/deploy-oracle-router.js --network bnb_testnet
```

This will:
- Deploy OracleRouter contract
- Register common feeds (ETH, BTC, BNB, USDT, USDC)
- Set initial prices

### Step 2: Update Frontend Address

After deployment, update `frontend/src/lib/contracts.ts`:

```typescript
export const CONTRACT_ADDRESSES = {
  ORACLE_ROUTER: "0x...", // New OracleRouter address from deployment
  PREDICTION_MARKET_FACTORY: "0xa7056B7d2d7B97dE9F254C17Ab7E0470E5F112c0",
} as const;
```

## Chainlink Integration (Optional)

### BNB Price Feed on BNB Testnet

Chainlink doesn't have official BNB/USD feeds on BNB testnet. You have two options:

#### Option 1: Manual Price Updates (Recommended for Testnet)

Use the `updatePrice()` function to manually set prices:

```javascript
const oracleRouter = new ethers.Contract(
  ORACLE_ROUTER_ADDRESS,
  [
    "function updatePrice(bytes32 feedId, uint256 price) external",
  ],
  signer
);

const feedId = ethers.encodeBytes32String("BNB");
const price = ethers.parseUnits("300", 8); // $300 with 8 decimals
await oracleRouter.updatePrice(feedId, price);
```

#### Option 2: Use Chainlink on Mainnet (Production)

For production, use Chainlink price feeds on BNB mainnet:
- BNB/USD: `0x0567F2323251f0Aab15c8dFb1967E4e8A7D42aeE` (BNB Mainnet)
- ETH/USD: `0x9ef1B8c0E4F7dc8bF5719Ea496883DC6401d5b2e` (BNB Mainnet)

Update OracleRouter to use Chainlink feeds:

```javascript
// Register feed with Chainlink aggregator address
const chainlinkBNBFeed = "0x0567F2323251f0Aab15c8dFb1967E4e8A7D42aeE";
const feedId = ethers.encodeBytes32String("BNB");
await oracleRouter.registerFeed(feedId, chainlinkBNBFeed);
```

## What Needs to Be Deployed

### Required:
1. **OracleRouter** - Central registry for feeds
   - Deploy: `scripts/deploy-oracle-router.js`
   - Or register feeds: `scripts/register-feeds.js`

### Optional (for production):
2. **ChainlinkFallback** - For Chainlink oracle integration
   - Already deployed in `scripts/deploy.js`
   - Configure with Chainlink feed addresses

3. **RedstoneOracle** - For fast oracle resolution
   - Already deployed in `scripts/deploy.js`

## Manual Feed Registration (Browser Console)

If you need to register feeds manually:

```javascript
// Connect to OracleRouter
const oracleRouter = new ethers.Contract(
  "0xcff09905f8f18b35f5a1ba6d2822d62b3d8c48be",
  [
    "function registerFeed(bytes32 feedId, address priceFeed) external",
    "function updatePrice(bytes32 feedId, uint256 price) external",
    "function isValidFeed(bytes32 feedId) external view returns (bool)",
  ],
  signer // Your wallet signer
);

// Register BNB feed
const bnbFeedId = ethers.encodeBytes32String("BNB");
await oracleRouter.registerFeed(bnbFeedId, ethers.ZeroAddress); // ZeroAddress = manual updates

// Set BNB price ($300 with 8 decimals)
const bnbPrice = ethers.parseUnits("300", 8);
await oracleRouter.updatePrice(bnbFeedId, bnbPrice);

// Verify
const isValid = await oracleRouter.isValidFeed(bnbFeedId);
console.log("BNB feed valid:", isValid);
```

## Common Feed Prices (8 decimals)

- ETH: $2500 = `ethers.parseUnits("2500", 8)`
- BTC: $45000 = `ethers.parseUnits("45000", 8)`
- BNB: $300 = `ethers.parseUnits("300", 8)`
- USDT: $1 = `ethers.parseUnits("1", 8)`
- USDC: $1 = `ethers.parseUnits("1", 8)`

## Troubleshooting

### Error: "FeedId does not exist"
- Run `register-feeds.js` to register feeds
- Or manually register using the browser console method above

### Error: "Not authorized"
- Make sure you're using the owner account
- Check that you're connected to the correct network (BNB Testnet)

### Error: "Factory contract validation failed"
- Ensure feedId is registered in OracleRouter
- Check that feed is active (`isValidFeed()` returns true)
- Verify threshold format matches feed decimals (usually 8)

## Next Steps

After registering feeds:
1. Try creating a market with registered feedIds (BNB, ETH, BTC, etc.)
2. The factory contract will validate the feedId exists
3. Market creation should succeed!



