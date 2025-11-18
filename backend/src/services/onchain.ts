import { Contract, ethers, JsonRpcProvider } from "ethers";

const FACTORY_ADDRESS = process.env.FACTORY_ADDRESS || "0xDfdd62075F027cbcE342C6533255cF338D164E46";
const RPC_URL = process.env.BNB_CHAIN_RPC_URL || "https://data-seed-prebsc-1-s1.binance.org:8545";

// Factory ABI - only need the event
const FACTORY_ABI = [
  "event MarketCreated(address indexed market, address indexed creator, address indexed feedAddress)",
  "function getMarkets() external view returns (address[] memory)",
] as const;

/**
 * Fetch market creators from on-chain MarketCreated events
 * Returns a map of creator address -> count of markets created
 */
export async function getMarketCreatorsOnChain(): Promise<Map<string, number>> {
  try {
    const provider = new JsonRpcProvider(RPC_URL);
    const factory = new Contract(FACTORY_ADDRESS, FACTORY_ABI, provider);

    // Get event signature hash
    const eventTopic = ethers.id("MarketCreated(address,address,address)");
    
    // Query all MarketCreated events
    const filter = {
      address: FACTORY_ADDRESS,
      topics: [eventTopic],
    };

    const events = await provider.getLogs(filter);
    console.log(`[onchain] Found ${events.length} MarketCreated events`);

    // Count markets created per address
    const creatorCounts = new Map<string, number>();

    for (const log of events) {
      try {
        // Parse event - topics[2] is the creator address (second indexed param)
        if (log.topics && log.topics.length >= 3) {
          // Extract creator address from topics[2]
          // topics[2] is padded to 32 bytes, so we need to extract the address
          const creatorAddress = ethers.getAddress("0x" + log.topics[2].slice(26)).toLowerCase();
          
          // Increment count for this creator
          const currentCount = creatorCounts.get(creatorAddress) || 0;
          creatorCounts.set(creatorAddress, currentCount + 1);
        }
      } catch (err) {
        console.warn(`[onchain] Failed to parse event log:`, err);
        // Try alternative parsing using factory interface
        try {
          const decoded = factory.interface.parseLog({
            topics: log.topics,
            data: log.data,
          });
          if (decoded && decoded.args && decoded.args.creator) {
            const creatorAddress = decoded.args.creator.toLowerCase();
            const currentCount = creatorCounts.get(creatorAddress) || 0;
            creatorCounts.set(creatorAddress, currentCount + 1);
          }
        } catch (parseErr) {
          console.warn(`[onchain] Failed to decode event:`, parseErr);
        }
      }
    }

    console.log(`[onchain] Found ${creatorCounts.size} unique market creators`);
    return creatorCounts;
  } catch (error: any) {
    console.error("[onchain] Error fetching market creators:", error);
    // Return empty map on error - leaderboard will fallback to database
    return new Map();
  }
}

/**
 * Get market creator count for a specific address
 */
export async function getMarketCreatorCount(address: string): Promise<number> {
  const creators = await getMarketCreatorsOnChain();
  return creators.get(address.toLowerCase()) || 0;
}

// Market contract ABI - need PositionOpened event and positions mapping
const MARKET_ABI = [
  "event PositionOpened(uint256 indexed marketId, address indexed trader, bool side, uint256 amount)",
  "function positions(uint256 marketId, address user) external view returns (uint256 amount, bool side)",
  "function markets(uint256 marketId) external view returns (uint256 id, string question, string category, uint256 endTime, uint256 resolutionTime, uint256 totalLiquidity, uint8 status, uint256 outcome, address creator, uint256 platformFee)",
] as const;

/**
 * Fetch all positions from on-chain contracts
 * Returns a map of user address -> { betsCount, totalVolume, wins, resolvedBets }
 */
export async function getPositionsOnChain(): Promise<Map<string, {
  betsCount: number;
  totalVolume: number;
  wins: number;
  resolvedBets: number;
}>> {
  try {
    const provider = new JsonRpcProvider(RPC_URL);
    const factory = new Contract(FACTORY_ADDRESS, FACTORY_ABI, provider);

    // Get all market addresses
    const marketAddresses: string[] = await factory.getMarkets();
    console.log(`[onchain] Found ${marketAddresses.length} markets for position fetching`);

    const userStats = new Map<string, {
      betsCount: number;
      totalVolume: number;
      wins: number;
      resolvedBets: number;
    }>();

    // Query PositionOpened events from all markets
    const POSITION_OPENED_TOPIC = ethers.id("PositionOpened(uint256,address,bool,uint256)");
    
    // Fetch events from all markets in parallel
    const eventPromises = marketAddresses.map(async (marketAddress) => {
      try {
        const filter = {
          address: marketAddress,
          topics: [POSITION_OPENED_TOPIC],
          fromBlock: 0,
          toBlock: "latest",
        };
        return await provider.getLogs(filter);
      } catch (err) {
        console.warn(`[onchain] Failed to fetch events from market ${marketAddress}:`, err);
        return [];
      }
    });

    const allEventArrays = await Promise.all(eventPromises);
    const allEvents = allEventArrays.flat();
    console.log(`[onchain] Found ${allEvents.length} PositionOpened events`);

    // Parse all PositionOpened events
    for (const log of allEvents) {
      try {
        // Parse event - topics[1] = marketId (indexed), topics[2] = trader (indexed)
        // data contains: side (bool) + amount (uint256)
        if (log.topics && log.topics.length >= 3) {
          const traderAddress = ethers.getAddress("0x" + log.topics[2].slice(26)).toLowerCase();
          
          // Decode the event data to get side and amount
          const marketContract = new Contract(log.address, MARKET_ABI, provider);
          let decoded: any = null;
          try {
            decoded = marketContract.interface.parseLog({
              topics: log.topics,
              data: log.data,
            });
          } catch (parseErr) {
            // Try manual parsing - data format: 0x + side (32 bytes) + amount (32 bytes)
            const data = log.data;
            if (data && data.length >= 130) {
              // First 32 bytes (after 0x) = side (bool, padded)
              const sideHex = data.slice(2, 66);
              const side = BigInt("0x" + sideHex) !== 0n;
              // Next 32 bytes = amount (uint256)
              const amountHex = data.slice(66, 130);
              const amount = BigInt("0x" + amountHex);
              decoded = { args: { side, amount } };
            }
          }

          if (decoded && decoded.args) {
            const amount = decoded.args.amount ? parseFloat(ethers.formatEther(decoded.args.amount)) : 0;
            const side = decoded.args.side !== undefined ? decoded.args.side : false;

            // Get or create user stats
            let stats = userStats.get(traderAddress);
            if (!stats) {
              stats = { betsCount: 0, totalVolume: 0, wins: 0, resolvedBets: 0 };
              userStats.set(traderAddress, stats);
            }

            stats.betsCount++;
            stats.totalVolume += amount;

            // Note: Wins and resolved bets will be calculated from market resolution states
            // For now, we just track bet counts and volume
          }
        }
      } catch (err) {
        console.warn(`[onchain] Failed to parse PositionOpened event:`, err);
      }
    }

    // Now fetch market states to determine wins
    // This is a simplified version - in production you'd want to cache market states
    console.log(`[onchain] Found ${userStats.size} unique bettors`);
    return userStats;
  } catch (error: any) {
    console.error("[onchain] Error fetching positions:", error);
    return new Map();
  }
}

