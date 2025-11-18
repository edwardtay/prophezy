# Redstone Oracle Integration - What's Needed

## Current State Analysis

### What Exists
1. **Contract Interface**: `RedstoneOracle.sol` has an `IRedstoneOracle` interface expecting `getValue(bytes32 dataFeedId)`
2. **Backend API Integration**: Python oracle service fetches data from Redstone REST API (`https://api.redstone.finance/prices`)
3. **Off-chain Resolution**: Backend calls Redstone API, stores result in DB, but doesn't interact with on-chain contract

### What's Missing for TRUE On-Chain Integration

## Critical Gaps

### 1. **Redstone SDK Package Missing**
- Current: No `@redstone-finance/evm-connector` package installed
- Needed: Install Redstone's official SDK for on-chain integration

### 2. **Wrong Contract Architecture**
- Current: Expects `redstoneOracle.getValue(dataFeedId)` to work like Chainlink
- Reality: Redstone uses a **pull model** with calldata, not a push model
- Needed: Use Redstone's `PriceFeed` contract or their calldata-based approach

### 3. **No On-Chain Data Feed Integration**
- Current: Contract expects an oracle address that doesn't exist
- Needed: Integrate with Redstone's on-chain PriceFeed contracts or use their calldata mechanism

### 4. **Missing Deployment Configuration**
- Current: Deploy script doesn't deploy or configure Redstone oracle
- Needed: Deploy Redstone PriceFeed contract or configure existing Redstone feeds

### 5. **No Transaction Integration**
- Current: Backend resolves off-chain, but doesn't call on-chain `resolveMarketFast()`
- Needed: Backend must call smart contract with Redstone data via calldata

## Required Changes

### Step 1: Install Redstone SDK
```bash
cd contracts
npm install @redstone-finance/evm-connector
```

### Step 2: Update RedstoneOracle.sol Contract

Redstone uses a pull model where data is passed via calldata. Two approaches:

#### Option A: Use Redstone's PriceFeed Contract (Recommended)
```solidity
import "@redstone-finance/evm-connector/contracts/data-feeds/PriceFeed.sol";

contract RedstoneOracle is Ownable {
    using PriceFeed for bytes32;
    
    function resolveMarketFast(
        uint256 marketId,
        bytes32 dataFeedId,
        uint256 threshold,
        bytes calldata redstonePayload  // Redstone data passed via calldata
    ) external onlyAuthorized returns (uint256) {
        // Extract price from Redstone calldata
        uint256 value = PriceFeed.getPriceFromMsg(dataFeedId);
        
        uint256 outcome = value >= threshold ? 1 : 2;
        // ... rest of resolution logic
    }
}
```

#### Option B: Use Redstone's PriceFeed.sol directly
```solidity
import "@redstone-finance/evm-connector/contracts/data-feeds/PriceFeed.sol";

contract RedstoneOracle is Ownable {
    PriceFeed public priceFeed;
    
    function resolveMarketFast(
        uint256 marketId,
        bytes32 dataFeedId,
        uint256 threshold
    ) external onlyAuthorized returns (uint256) {
        uint256 value = priceFeed.getPrice(dataFeedId);
        // ... rest of logic
    }
}
```

### Step 3: Update Backend to Call On-Chain Contract

The backend needs to:
1. Fetch Redstone data
2. Prepare Redstone calldata using their SDK
3. Call the smart contract with the calldata

```typescript
// backend/src/services/redstone.ts
import { RedstoneApi } from "@redstone-finance/sdk";
import { Contract } from "ethers";

async function resolveMarketOnChain(
  marketId: number,
  dataFeedId: string,
  threshold: number,
  contract: Contract
) {
  // Fetch Redstone data
  const redstoneData = await RedstoneApi.getPrice(dataFeedId);
  
  // Prepare calldata (Redstone SDK handles this)
  const calldata = RedstoneApi.prepareCalldata(dataFeedId, redstoneData);
  
  // Call contract with calldata
  const tx = await contract.resolveMarketFast(
    marketId,
    ethers.utils.formatBytes32String(dataFeedId),
    threshold,
    { data: calldata }  // Redstone data in calldata
  );
  
  await tx.wait();
}
```

### Step 4: Update Deployment Script

```javascript
// contracts/scripts/deploy.js
const { ethers } = require("hardhat");

async function main() {
  // Deploy RedstoneOracle with proper PriceFeed integration
  const RedstoneOracle = await ethers.getContractFactory("RedstoneOracle");
  
  // Option 1: Use existing Redstone PriceFeed on BNB Chain
  // Option 2: Deploy Redstone PriceFeed if needed
  const redstonePriceFeedAddress = process.env.REDSTONE_PRICE_FEED_ADDRESS || 
    "0x..."; // Redstone PriceFeed address on BNB Chain
  
  const redstoneOracle = await RedstoneOracle.deploy(redstonePriceFeedAddress);
  await redstoneOracle.waitForDeployment();
  
  // Deploy PredictionMarket with RedstoneOracle address
  const PredictionMarket = await ethers.getContractFactory("PredictionMarket");
  const predictionMarket = await PredictionMarket.deploy(
    await redstoneOracle.getAddress(),
    chainlinkAddress,
    disputeResolutionAddress
  );
}
```

### Step 5: Environment Variables

Add to `.env`:
```bash
# Redstone Configuration
REDSTONE_PRICE_FEED_ADDRESS=0x...  # Redstone PriceFeed contract on BNB Chain
REDSTONE_API_URL=https://api.redstone.finance
REDSTONE_API_KEY=your_api_key  # Optional, for rate limits
```

### Step 6: Update Oracle Service (Python)

The Python service should prepare Redstone calldata for on-chain calls:

```python
# oracle/redstone_integration.py
from redstone_finance_sdk import RedstonePriceFeed
import web3

async def prepare_redstone_calldata(data_feed_id: str) -> bytes:
    """Prepare Redstone calldata for on-chain transaction"""
    # Fetch latest price
    price_data = await fetch_redstone_price(data_feed_id)
    
    # Prepare calldata using Redstone SDK
    calldata = RedstonePriceFeed.prepare_calldata(
        data_feed_id=data_feed_id,
        price=price_data['value'],
        timestamp=price_data['timestamp']
    )
    
    return calldata
```

## Redstone Architecture Understanding

### How Redstone Works On-Chain

1. **Pull Model**: Data is NOT stored on-chain by default
2. **Calldata Approach**: Data is passed via transaction calldata
3. **PriceFeed Contract**: Validates and extracts prices from calldata
4. **Data Feeds**: Redstone maintains off-chain data feeds, on-chain contracts validate

### Key Differences from Chainlink

| Aspect | Chainlink | Redstone |
|--------|-----------|----------|
| Model | Push (data on-chain) | Pull (data in calldata) |
| Gas Cost | Higher (storage) | Lower (no storage) |
| Speed | Slower updates | Faster updates |
| Security | Decentralized network | Multi-source aggregation |

## Implementation Checklist

- [ ] Install `@redstone-finance/evm-connector` package
- [ ] Update `RedstoneOracle.sol` to use Redstone's PriceFeed
- [ ] Update `PredictionMarket.sol` to pass calldata to RedstoneOracle
- [ ] Create backend service to prepare Redstone calldata
- [ ] Update backend oracle route to call on-chain contract
- [ ] Update deployment script with Redstone PriceFeed address
- [ ] Add Redstone environment variables
- [ ] Test on-chain resolution flow
- [ ] Update frontend to show on-chain resolution status

## Testing the Integration

1. **Unit Tests**: Test RedstoneOracle contract with mock calldata
2. **Integration Tests**: Test full flow from API → calldata → contract
3. **E2E Tests**: Create market → wait for resolution → verify on-chain

## Resources

- Redstone Docs: https://docs.redstone.finance/
- Redstone SDK: https://www.npmjs.com/package/@redstone-finance/evm-connector
- Redstone PriceFeed: https://docs.redstone.finance/docs/smart-contract-devs/get-started/redstone-core

## Current Workaround (Not True Integration)

The current implementation works as an **off-chain oracle**:
- Backend fetches Redstone API
- Stores result in database
- Updates market status off-chain
- **Problem**: Not trustless, requires trusting backend

**True Integration** requires:
- On-chain contract calls with Redstone calldata
- Trustless resolution directly on-chain
- No backend dependency for resolution



