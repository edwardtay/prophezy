import { ethers } from "ethers";
import factoryArtifact from "@/abi/PredictionMarketFactory.json";
import marketArtifact from "@/abi/PredictionMarket.json";

// Deployed contract addresses on BNB Testnet
export const ORACLE_ROUTER_ADDRESS = "0x8F878deCd44f7Cf547D559a6e6D0577E370fa0Db";
export const FACTORY_ADDRESS = "0xDfdd62075F027cbcE342C6533255cF338D164E46";

// Backward compatibility - keep existing CONTRACT_ADDRESSES object
export const CONTRACT_ADDRESSES = {
  ORACLE_ROUTER: ORACLE_ROUTER_ADDRESS,
  PREDICTION_MARKET_FACTORY: FACTORY_ADDRESS,
} as const;

// BNB Testnet feeds map
export const BNB_TESTNET_FEEDS = {
  BTC: "0x491fD333937522e69D1c3FB944fbC5e95eEF9f59",
  ETH: "0x635780E5D02Ab29d7aE14d266936A38d3D5B0CC5",
  BNB: "0x1A26d803C2e796601794f8C5609549643832702C",
  // add more from the same table when you need them
} as const;

// BNB Testnet RPC
export const BNB_TESTNET_RPC = "https://data-seed-prebsc-1-s1.binance.org:8545";
export const BNB_TESTNET_CHAIN_ID = 97;

// BNB Testnet network configuration
export const BNB_TESTNET_CONFIG = {
  chainId: `0x${BNB_TESTNET_CHAIN_ID.toString(16)}`, // 0x61
  chainName: "BNB Smart Chain Testnet",
  nativeCurrency: {
    name: "BNB",
    symbol: "BNB",
    decimals: 18,
  },
  rpcUrls: [BNB_TESTNET_RPC],
  blockExplorerUrls: ["https://testnet.bscscan.com"],
};

// OracleRouter ABI (if needed to check feedId validity)
export const ORACLE_ROUTER_ABI = [
  "function getPrice(bytes32 feedId) external view returns (uint256)",
  "function isValidFeed(bytes32 feedId) external view returns (bool)",
] as const;

// Keep inline ABI for backward compatibility, but prefer using factoryABI from JSON
export const PREDICTION_MARKET_FACTORY_ABI = [
  "function getMarkets() external view returns (address[] memory)",
  "function createMarket(address feedAddress, string question, uint256 deadlineUnix, uint256 strikePriceRaw) external returns (address)",
  "event MarketCreated(address indexed market, address indexed creator, address indexed feedAddress)",
] as const;

// Use the PredictionMarket artifact ABI
export const PREDICTION_MARKET_ABI = marketArtifact.abi;

/**
 * Get a provider for BNB Testnet
 */
export function getProvider(): ethers.JsonRpcProvider {
  return new ethers.JsonRpcProvider(BNB_TESTNET_RPC);
}

/**
 * Get a signer from Privy wallet
 */
export function getSigner(provider: ethers.Provider): ethers.JsonRpcSigner | null {
  if (typeof window === "undefined" || !window.ethereum) {
    return null;
  }
  return new ethers.BrowserProvider(window.ethereum as any).getSigner();
}

/**
 * Get PredictionMarketFactory contract instance
 */
export function getFactoryContract(provider?: ethers.Provider) {
  const prov = provider || getProvider();
  return new ethers.Contract(
    FACTORY_ADDRESS,
    factoryArtifact.abi,
    prov
  );
}

/**
 * Get PredictionMarket contract instance
 */
export function getMarketContract(
  marketAddress: string,
  provider?: ethers.Provider
) {
  const prov = provider || getProvider();
  return new ethers.Contract(
    marketAddress,
    PREDICTION_MARKET_ABI,
    prov
  );
}

/**
 * Switch wallet to BNB Testnet
 * This will prompt the user to switch networks if they're not already on BNB Testnet
 */
export async function switchToBNBTestnet(): Promise<boolean> {
  if (typeof window === "undefined" || !window.ethereum) {
    throw new Error("No wallet provider found");
  }

  try {
    // Check current chain ID
    const currentChainId = await window.ethereum.request({
      method: "eth_chainId",
    });

    // If already on BNB Testnet, return success
    if (currentChainId === BNB_TESTNET_CONFIG.chainId) {
      return true;
    }

    // Try to switch to BNB Testnet
    try {
      await window.ethereum.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: BNB_TESTNET_CONFIG.chainId }],
      });
      return true;
    } catch (switchError: any) {
      // This error code indicates that the chain has not been added to MetaMask
      if (switchError.code === 4902) {
        // Try to add the chain
        try {
          await window.ethereum.request({
            method: "wallet_addEthereumChain",
            params: [BNB_TESTNET_CONFIG],
          });
          return true;
        } catch (addError) {
          console.error("Failed to add BNB Testnet:", addError);
          throw new Error("Failed to add BNB Testnet to wallet");
        }
      } else {
        // User rejected the switch
        throw switchError;
      }
    }
  } catch (error: any) {
    console.error("Failed to switch network:", error);
    if (error.code === 4001) {
      throw new Error("User rejected network switch");
    }
    throw error;
  }
}

/**
 * Check if wallet is connected to BNB Testnet
 */
export async function isOnBNBTestnet(): Promise<boolean> {
  if (typeof window === "undefined" || !window.ethereum) {
    return false;
  }

  try {
    const chainId = await window.ethereum.request({
      method: "eth_chainId",
    });
    return chainId === BNB_TESTNET_CONFIG.chainId;
  } catch (error) {
    console.error("Failed to check chain ID:", error);
    return false;
  }
}

/**
 * Ensure wallet is on BNB Testnet before a transaction
 * This should be called right before getting a provider/signer for any transaction
 * It will automatically prompt the user to switch networks if needed
 */
export async function ensureBNBTestnet(): Promise<void> {
  if (typeof window === "undefined" || !window.ethereum) {
    throw new Error("No wallet provider found");
  }

  try {
    // Check if already on correct network
    const isOnCorrectNetwork = await isOnBNBTestnet();
    if (isOnCorrectNetwork) {
      return;
    }

    // Switch to BNB Testnet
    await switchToBNBTestnet();
    
    // Verify switch was successful
    const verifyNetwork = await isOnBNBTestnet();
    if (!verifyNetwork) {
      throw new Error("Failed to switch to BNB Testnet. Please switch manually.");
    }
  } catch (error: any) {
    if (error.message?.includes("rejected") || error.code === 4001) {
      throw new Error("Please switch to BNB Testnet to continue");
    }
    throw error;
  }
}

/**
 * Market state enum
 */
export enum MarketState {
  Active = 0,
  Locked = 1,
  Resolved = 2,
}

/**
 * Market data interface
 */
export interface MarketData {
  address: string;
  feedId: string;
  currentPrice: string;
  lockPrice: string;
  state: MarketState;
  totalYes: string;
  totalNo: string;
  // Optional metadata (stored off-chain)
  question?: string;
  category?: string;
  description?: string;
  imageUrl?: string;
  // Computed fields
  trendingScore?: number;
  creationTxHash?: string; // Transaction hash that created this market
  creatorAddress?: string; // Address of the market creator
  marketId?: number; // Backend database ID for API calls
  createdAt?: string; // ISO timestamp of market creation
}

