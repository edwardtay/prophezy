const hre = require("hardhat");

async function main() {
  console.log("Deploying Prophezy contracts...");

  // Deploy ChainlinkFallback (placeholder - implement if needed)
  const ChainlinkFallback = await hre.ethers.getContractFactory("ChainlinkFallback");
  const chainlinkFallback = await ChainlinkFallback.deploy();
  await chainlinkFallback.waitForDeployment();
  const chainlinkFallbackAddress = await chainlinkFallback.getAddress();
  console.log("ChainlinkFallback deployed to:", chainlinkFallbackAddress);

  // Deploy DisputeResolution (placeholder - implement if needed)
  const DisputeResolution = await hre.ethers.getContractFactory("DisputeResolution");
  const disputeResolution = await DisputeResolution.deploy();
  await disputeResolution.waitForDeployment();
  const disputeResolutionAddress = await disputeResolution.getAddress();
  console.log("DisputeResolution deployed to:", disputeResolutionAddress);

  // Deploy PredictionMarket with oracle addresses
  const PredictionMarket = await hre.ethers.getContractFactory("PredictionMarket");
  const predictionMarket = await PredictionMarket.deploy(
    chainlinkFallbackAddress,
    disputeResolutionAddress
  );
  await predictionMarket.waitForDeployment();
  const predictionMarketAddress = await predictionMarket.getAddress();
  console.log("PredictionMarket deployed to:", predictionMarketAddress);

  // Authorize deployer as oracle in PredictionMarket
  const [deployer] = await hre.ethers.getSigners();
  const authorizeOracleTx = await predictionMarket.authorizeOracle(deployer.address, true);
  await authorizeOracleTx.wait();
  console.log("Authorized deployer as oracle in PredictionMarket");

  // Deploy LiquidityAggregator
  const LiquidityAggregator = await hre.ethers.getContractFactory("LiquidityAggregator");
  const liquidityAggregator = await LiquidityAggregator.deploy(predictionMarketAddress);
  await liquidityAggregator.waitForDeployment();
  const liquidityAggregatorAddress = await liquidityAggregator.getAddress();
  console.log("LiquidityAggregator deployed to:", liquidityAggregatorAddress);

  // Deploy AccountAbstraction
  const AccountAbstraction = await hre.ethers.getContractFactory("AccountAbstraction");
  const accountAbstraction = await AccountAbstraction.deploy();
  await accountAbstraction.waitForDeployment();
  const accountAbstractionAddress = await accountAbstraction.getAddress();
  console.log("AccountAbstraction deployed to:", accountAbstractionAddress);

  console.log("\n=== Deployment Summary ===");
  console.log("ChainlinkFallback:", chainlinkFallbackAddress);
  console.log("DisputeResolution:", disputeResolutionAddress);
  console.log("PredictionMarket:", predictionMarketAddress);
  console.log("LiquidityAggregator:", liquidityAggregatorAddress);
  console.log("AccountAbstraction:", accountAbstractionAddress);
  
  console.log("\n=== Environment Variables ===");
  console.log(`PREDICTION_MARKET_ADDRESS=${predictionMarketAddress}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

