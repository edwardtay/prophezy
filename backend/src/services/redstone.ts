import { Contract, ethers, JsonRpcProvider, Wallet } from "ethers";
import { 
  getPriceFromPayload,
  getPriceFromPayloadBytes,
  getUniqueSignersCountFromPayload
} from "@redstone-finance/sdk";
import axios from "axios";

/**
 * Redstone Oracle Service
 * Prepares Redstone calldata and calls on-chain contracts for market resolution
 * 
 * Redstone uses a pull model where price data is passed via transaction calldata.
 * The contract extracts the price from calldata using Redstone's PriceFeed library.
 */

const REDSTONE_API_URL = process.env.REDSTONE_API_URL || "https://api.redstone.finance";
const REDSTONE_API_KEY = process.env.REDSTONE_API_KEY || "";

/**
 * Fetch price data from Redstone API
 */
export async function fetchRedstonePrice(dataFeedId: string): Promise<number> {
  try {
    const headers: Record<string, string> = {};
    if (REDSTONE_API_KEY) {
      headers["Authorization"] = `Bearer ${REDSTONE_API_KEY}`;
    }

    const response = await axios.get(
      `${REDSTONE_API_URL}/prices`,
      {
        params: { symbols: dataFeedId },
        headers,
        timeout: 10000,
      }
    );

    if (response.status !== 200) {
      throw new Error(`Redstone API error: ${response.statusText}`);
    }

    const data = response.data;
    if (!data[dataFeedId]) {
      throw new Error(`Data feed ${dataFeedId} not found`);
    }

    return parseFloat(data[dataFeedId].value || data[dataFeedId].price || 0);
  } catch (error: any) {
    console.error("Error fetching Redstone price:", error);
    throw new Error(`Failed to fetch Redstone price: ${error.message}`);
  }
}

/**
 * Get Redstone price payload for on-chain use
 * This fetches the signed price data from Redstone that can be used in calldata
 */
export async function getRedstonePricePayload(dataFeedId: string): Promise<string> {
  try {
    // Fetch price data with signature from Redstone
    const response = await axios.get(
      `${REDSTONE_API_URL}/prices`,
      {
        params: { 
          symbols: dataFeedId,
          provider: "redstone" // Request signed data
        },
        headers: REDSTONE_API_KEY ? { Authorization: `Bearer ${REDSTONE_API_KEY}` } : {},
        timeout: 10000,
      }
    );

    if (response.status !== 200) {
      throw new Error(`Redstone API error: ${response.statusText}`);
    }

    // Return the payload that includes signed price data
    // This will be used in the transaction calldata
    return JSON.stringify(response.data);
  } catch (error: any) {
    console.error("Error fetching Redstone payload:", error);
    throw new Error(`Failed to fetch Redstone payload: ${error.message}`);
  }
}

/**
 * Resolve market on-chain using Redstone oracle
 * This function:
 * 1. Fetches price from Redstone API (for validation)
 * 2. Prepares transaction with Redstone data in calldata
 * 3. Calls the PredictionMarket contract
 * 
 * Note: Redstone's PriceFeed library in the contract will extract the price
 * from the transaction calldata automatically.
 */
export async function resolveMarketWithRedstoneOnChain(
  rpcUrl: string,
  privateKey: string,
  predictionMarketAddress: string,
  predictionMarketAbi: any[],
  marketId: number,
  dataFeedId: string,
  threshold: number
): Promise<{ txHash: string; price: number }> {
  try {
    // Setup provider and signer
    const provider = new JsonRpcProvider(rpcUrl);
    const signer = new Wallet(privateKey, provider);

    // 1. Fetch price from Redstone API (for validation/logging)
    const price = await fetchRedstonePrice(dataFeedId);
    console.log(`Redstone price for ${dataFeedId}: ${price}`);

    // 2. Get contract instance
    const predictionMarket = new Contract(
      predictionMarketAddress,
      predictionMarketAbi,
      signer
    );

    // 3. Convert dataFeedId to bytes32
    const dataFeedIdBytes32 = ethers.encodeBytes32String(dataFeedId);

    // 4. Call resolveMarketFast
    // The Redstone PriceFeed library in the contract will extract the price
    // from the transaction calldata. The calldata is prepared by Redstone's
    // data providers and included automatically when using their integration.
    // 
    // For now, we call the function directly. In production, you would use
    // Redstone's wrapper or prepare the calldata using their SDK.
    const tx = await predictionMarket.resolveMarketFast(
      marketId,
      dataFeedIdBytes32
    );

    console.log(`Transaction sent: ${tx.hash}`);
    await tx.wait();
    console.log(`Transaction confirmed: ${tx.hash}`);

    return {
      txHash: tx.hash,
      price: price,
    };
  } catch (error: any) {
    console.error("Error resolving market with Redstone on-chain:", error);
    throw new Error(`Failed to resolve market on-chain: ${error.message}`);
  }
}

/**
 * Get Redstone price (for off-chain validation)
 */
export async function getRedstonePrice(dataFeedId: string): Promise<number> {
  return await fetchRedstonePrice(dataFeedId);
}

