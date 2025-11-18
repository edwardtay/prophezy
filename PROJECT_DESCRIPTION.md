# Prophezy - Project Description

## Vision

**Prophezy = Shopify for Prediction Markets**

Make prediction markets as accessible as creating a Twitter poll. No crypto knowledge required, no gas fees, instant resolution.

## Problem Statement

Current prediction markets face two critical bottlenecks:

1. **Slow Oracle Resolution**: UMA's Optimistic Oracle takes 24-48 hours, making markets impractical for time-sensitive events
2. **Complex Web3 UX**: Users need wallets, understand gas fees, and navigate complex interfaces

## Solution

Prophezy combines three innovations:

### 1. Secure Oracles
- **Primary**: Chainlink for secure market resolution (24 hours)
- **Future**: UMA for arbitrary events (requires offchain router/mirror)
- **Result**: Reliable resolution with Chainlink's proven security

### 2. Account Abstraction (Gasless UX)
- **Privy Integration**: Social login (Google, Twitter, Discord), embedded wallets, no external wallet needed
- **Social Login**: Google/Twitter → instant access
- **Gasless Transactions**: Sponsored by protocol
- **Result**: Web2-like experience with Web3 benefits

### 3. One-Click Market Creation
- **30-Second Setup**: Template-based creation
- **Auto-Configuration**: Oracle selection, liquidity pools
- **Mobile-First PWA**: Accessible anywhere

## Technical Architecture

### Smart Contracts (BNB Chain)
- `PredictionMarket.sol`: Core market logic
- `ChainlinkFallback.sol`: Chainlink oracle integration
- `DisputeResolution.sol`: Handle contested results
- `LiquidityAggregator.sol`: Cross-market liquidity routing
- `AccountAbstraction.sol`: ERC-4337 compatible

### Backend API
- Node.js/Express REST API
- PostgreSQL database
- Oracle service integration
- Real-time market data

### Frontend
- Next.js 14 PWA (mobile-first)
- Privy SDK for Account Abstraction (social login, embedded wallets)
- Real-time updates

### Oracle Service
- Python FastAPI service
- Chainlink integration
- Performance metrics tracking

## Key Features

### Core MVP (Hackathon)
✅ Secure oracle resolution (Chainlink)  
✅ Account Abstraction (gasless UX)  
✅ One-click market creation  
✅ Liquidity aggregation  
✅ Mobile-first PWA  
✅ Oracle performance dashboard  
✅ Dispute resolution  

### Post-Hackathon
- Social login integration
- Fiat on-ramp (Transak/MoonPay)
- Multi-stage predictions
- BNB Greenfield integration
- Cross-chain expansion

## Competitive Advantages

| Feature | Polymarket | **Prophezy** |
|---------|-----------|----------------|
| Oracle Speed | 24-48hrs | **24 hrs** |
| Requires Wallet | Yes | **No (AA)** |
| Gas Fees | User pays | **Gasless** |
| Market Creation | Complex | **One-click** |
| BNB Chain Native | No | **Yes** |

## Use Cases

1. **Price Predictions**: Crypto, stocks, commodities
2. **Event Outcomes**: Sports, elections, milestones
3. **Subjective Predictions**: Awards, rankings
4. **Multi-Stage Predictions**: Graduated outcomes

## Revenue Model

**Fee Structure**: 1-2% on winning bets
- Oracle providers (Chainlink node operators)
- Liquidity providers
- Protocol treasury
- Dispute resolution stakers

**Additional Revenue**:
- Market creation fees (optional)
- Premium oracle services
- API access for developers

## BNB Chain Integration

- ✅ BNB Chain testnet deployment
- ✅ opBNB L2 deployment plan
- ✅ BNB Greenfield integration (future)
- ✅ BNB Attestation Service (identity)

## Team

[To be added]

## Roadmap

**Phase 1 (Hackathon)**: ✅
- Core oracle integration
- Basic Account Abstraction
- One-click market creation
- Liquidity aggregation

**Phase 2 (Post-Hackathon)**:
- Full Privy integration
- Mainnet deployment
- Social login
- Fiat on-ramp

**Phase 3 (Future)**:
- Cross-chain expansion
- Advanced features
- Mobile app

## Links

- **GitHub**: [Repository URL]
- **Demo**: [Live Demo URL]
- **Video**: [Demo Video URL]
- **Documentation**: [Docs URL]

