const hre = require("hardhat");
const { ethers } = require("hardhat");

// OracleRouter address (update this to your deployed OracleRouter)
const ORACLE_ROUTER_ADDRESS = "0xcff09905f8f18b35f5a1ba6d2822d62b3d8c48be";

async function main() {
  console.log("Registering feeds in OracleRouter...");
  console.log("OracleRouter address:", ORACLE_ROUTER_ADDRESS);

  const [deployer] = await hre.ethers.getSigners();
  console.log("Using account:", deployer.address);

  // Get OracleRouter contract
  const OracleRouter = await hre.ethers.getContractFactory("OracleRouter");
  const oracleRouter = OracleRouter.attach(ORACLE_ROUTER_ADDRESS);

  // Common feeds to register
  const feedsToRegister = [
    { name: "ETH", price: "2500" }, // $2500
    { name: "BTC", price: "45000" }, // $45000
    { name: "BNB", price: "300" }, // $300
    { name: "USDT", price: "1" }, // $1
    { name: "USDC", price: "1" }, // $1
  ];

  console.log("\nRegistering feeds...");

  for (const feed of feedsToRegister) {
    const feedId = ethers.encodeBytes32String(feed.name);
    
    try {
      // Check if feed already exists
      const hasFeed = await oracleRouter.hasFeed(feedId);
      
      if (hasFeed) {
        console.log(`  ⚠ ${feed.name} already registered, skipping...`);
        
        // Update price anyway
        const price = ethers.parseUnits(feed.price, 8);
        const updateTx = await oracleRouter.updatePrice(feedId, price);
        await updateTx.wait();
        console.log(`  ✓ Updated ${feed.name} price to $${feed.price}`);
      } else {
        // Register new feed
        const registerTx = await oracleRouter.registerFeed(feedId, ethers.ZeroAddress);
        await registerTx.wait();
        console.log(`  ✓ Registered ${feed.name}`);

        // Set initial price
        const price = ethers.parseUnits(feed.price, 8);
        const priceTx = await oracleRouter.updatePrice(feedId, price);
        await priceTx.wait();
        console.log(`  ✓ Set ${feed.name} price to $${feed.price}`);
      }
    } catch (error) {
      console.error(`  ✗ Failed to register ${feed.name}:`, error.message);
    }
  }

  console.log("\n✅ Feed registration complete!");
  console.log("\nYou can now use these feedIds when creating markets:");
  feedsToRegister.forEach(feed => console.log(`  - ${feed.name}`));
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });



