const hre = require("hardhat");
const { ethers } = require("hardhat");

async function main() {
  console.log("Deploying OracleRouter...");

  // Deploy OracleRouter
  const OracleRouter = await hre.ethers.getContractFactory("OracleRouter");
  const oracleRouter = await OracleRouter.deploy();
  await oracleRouter.waitForDeployment();
  const oracleRouterAddress = await oracleRouter.getAddress();
  console.log("OracleRouter deployed to:", oracleRouterAddress);

  // Register common feeds
  console.log("\nRegistering common feeds...");
  
  const commonFeeds = ["ETH", "BTC", "BNB", "USDT", "USDC"];
  
  for (const feedName of commonFeeds) {
    const feedId = ethers.encodeBytes32String(feedName);
    
    // Register feed with zero address (manual price updates)
    // In production, you would set this to a Chainlink price feed address
    const tx = await oracleRouter.registerFeed(feedId, ethers.ZeroAddress);
    await tx.wait();
    
    // Set initial price (example prices - adjust as needed)
    const examplePrices = {
      ETH: ethers.parseUnits("2500", 8), // $2500 with 8 decimals
      BTC: ethers.parseUnits("45000", 8), // $45000 with 8 decimals
      BNB: ethers.parseUnits("300", 8), // $300 with 8 decimals
      USDT: ethers.parseUnits("1", 8), // $1 with 8 decimals
      USDC: ethers.parseUnits("1", 8), // $1 with 8 decimals
    };
    
    const price = examplePrices[feedName] || ethers.parseUnits("1000", 8);
    const priceTx = await oracleRouter.updatePrice(feedId, price);
    await priceTx.wait();
    
    console.log(`  ✓ Registered ${feedName} (feedId: ${feedId}) with price: ${ethers.formatUnits(price, 8)}`);
  }

  console.log("\n✅ OracleRouter deployment complete!");
  console.log("\nNext steps:");
  console.log("1. Update CONTRACT_ADDRESSES.ORACLE_ROUTER in frontend/src/lib/contracts.ts");
  console.log(`2. Set ORACLE_ROUTER=${oracleRouterAddress}`);
  console.log("3. Update factory contract to use this OracleRouter address");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });



