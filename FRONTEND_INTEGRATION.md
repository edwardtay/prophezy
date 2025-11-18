# Frontend Integration - Direct Contract Interaction

## ✅ Integration Complete

The frontend now directly interacts with your deployed contracts on BNB Testnet:
- **OracleRouter**: `0xcff09905f8f18b35f5a1ba6d2822d62b3d8c48be`
- **PredictionMarketFactory**: `0xa7056B7d2d7B97dE9F254C17Ab7E0470E5F112c0`

## What Was Implemented

### 1. Contract Configuration (`frontend/src/lib/contracts.ts`)
- ✅ Hardcoded contract addresses
- ✅ Contract ABIs for Factory and PredictionMarket
- ✅ Helper functions to get contract instances
- ✅ TypeScript interfaces for market data

### 2. React Hooks (`frontend/src/hooks/useMarkets.ts`)
- ✅ `useMarkets()` - Fetches all markets from factory
- ✅ `useMarket(address)` - Fetches single market data
- ✅ Automatically reads from blockchain

### 3. Updated Components
- ✅ **MarketList** - Lists all markets from factory contract
- ✅ **BetModal** - Directly calls `participateYes()` / `participateNo()` on contracts
- ✅ Real-time price and liquidity display
- ✅ Calculates odds from on-chain data

## How It Works

### Market Listing Flow
1. Frontend calls `factory.getMarkets()` to get all market addresses
2. For each market, fetches:
   - `getCurrentPrice()` - Current market price
   - `lockPrice()` - Locked price (if market is locked)
   - `state()` - Market state (Active/Locked/Resolved)
   - `totalYes()` - Total YES liquidity
   - `totalNo()` - Total NO liquidity
   - `feedId()` - Data feed identifier

### Betting Flow
1. User clicks YES/NO button
2. BetModal opens with amount input
3. User enters BNB amount
4. Frontend calls `market.participateYes({ value: amountWei })` or `participateNo()`
5. Transaction is sent via user's wallet (MetaMask/Privy)
6. Market data refreshes after transaction confirms

## Contract Methods Used

### PredictionMarketFactory
```solidity
getMarkets() → address[]  // Get all market addresses
```

### PredictionMarket
```solidity
// View functions
getCurrentPrice() → uint256
lockPrice() → uint256
state() → uint8  // 0=Active, 1=Locked, 2=Resolved
totalYes() → uint256
totalNo() → uint256
feedId() → bytes32

// State-changing functions
participateYes() payable  // Bet YES with BNB
participateNo() payable   // Bet NO with BNB
lockMarket()              // Lock the market
resolve()                 // Resolve the market
claim()                   // Claim winnings
```

## Market States

- **Active (0)**: Market is open for betting
- **Locked (1)**: Market is locked, waiting for resolution
- **Resolved (2)**: Market is resolved, users can claim

## Features

### ✅ Working Now
- View all markets from factory
- See current prices and liquidity
- Place bets directly on-chain
- Real-time odds calculation
- Market state display

### 🔄 To Be Added
- Market creation (call factory)
- Market locking
- Market resolution
- Claim winnings
- Market metadata (question text) - currently shows feedId

## Market Metadata

**Note**: The contracts only store `feedId` (bytes32), not human-readable questions. 

**Options for adding metadata**:
1. **Events**: Add `MarketCreated` event with question string
2. **Off-chain storage**: JSON file or database mapping market address → metadata
3. **IPFS**: Store metadata on IPFS, hash in contract

For now, the frontend displays the feedId. You can add metadata later.

## Testing

1. **Start Frontend**:
```bash
cd frontend
npm run dev
```

2. **Connect Wallet**:
   - Use MetaMask or Privy
   - Connect to BNB Testnet (Chain ID: 97)

3. **View Markets**:
   - Markets load automatically from factory
   - Shows all deployed PredictionMarket instances

4. **Place Bet**:
   - Click YES/NO on any active market
   - Enter BNB amount
   - Confirm transaction in wallet
   - Wait for confirmation

## Environment Variables

No environment variables needed! Contract addresses are hardcoded in `contracts.ts`.

If you want to make them configurable, add to `.env.local`:
```bash
NEXT_PUBLIC_FACTORY_ADDRESS=0xa7056B7d2d7B97dE9F254C17Ab7E0470E5F112c0
NEXT_PUBLIC_ORACLE_ROUTER_ADDRESS=0xcff09905f8f18b35f5a1ba6d2822d62b3d8c48be
```

## Next Steps

1. ✅ **Market Listing** - Done
2. ✅ **Betting** - Done
3. ⏳ **Market Creation** - Add factory.createMarket() call
4. ⏳ **Market Resolution** - Add resolve() and claim() buttons
5. ⏳ **Market Metadata** - Add question/description storage
6. ⏳ **Transaction History** - Show user's positions

## Contract Addresses

```typescript
ORACLE_ROUTER: "0xcff09905f8f18b35f5a1ba6d2822d62b3d8c48be"
PREDICTION_MARKET_FACTORY: "0xa7056B7d2d7B97dE9F254C17Ab7E0470E5F112c0"
```

These are hardcoded in `frontend/src/lib/contracts.ts` and can be updated if needed.



