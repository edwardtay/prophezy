const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("PredictionMarket", function () {
  let predictionMarket;
  let owner;
  let oracle;
  let user1;
  let user2;

  beforeEach(async function () {
    [owner, oracle, user1, user2] = await ethers.getSigners();

    const PredictionMarket = await ethers.getContractFactory("PredictionMarket");
    predictionMarket = await PredictionMarket.deploy();
    await predictionMarket.waitForDeployment();

    // Authorize oracle
    await predictionMarket.authorizeOracle(oracle.address, true);
  });

  describe("Market Creation", function () {
    it("Should create a new market", async function () {
      const tx = await predictionMarket
        .connect(user1)
        .createMarket(
          "Will Bitcoin reach $100k by 2025?",
          "Crypto",
          86400, // 1 day
          3600 // 1 hour resolution delay
        );

      await expect(tx)
        .to.emit(predictionMarket, "MarketCreated")
        .withArgs(1, user1.address, "Will Bitcoin reach $100k by 2025?", any);

      const market = await predictionMarket.getMarket(1);
      expect(market.question).to.equal("Will Bitcoin reach $100k by 2025?");
      expect(market.creator).to.equal(user1.address);
    });
  });

  describe("Position Opening", function () {
    beforeEach(async function () {
      await predictionMarket
        .connect(user1)
        .createMarket("Test Question", "Test", 86400, 3600);
    });

    it("Should open a position", async function () {
      const amount = ethers.parseEther("1.0");
      await expect(
        predictionMarket.connect(user2).openPosition(1, true, { value: amount })
      )
        .to.emit(predictionMarket, "PositionOpened")
        .withArgs(1, user2.address, true, any);

      const position = await predictionMarket.getUserPosition(1, user2.address);
      expect(position.amount).to.be.gt(0);
    });
  });

  describe("Market Resolution", function () {
    beforeEach(async function () {
      await predictionMarket
        .connect(user1)
        .createMarket("Test Question", "Test", 86400, 3600);
      // Fast forward time
      await ethers.provider.send("evm_increaseTime", [86400]);
    });

    it("Should resolve market as oracle", async function () {
      await expect(
        predictionMarket.connect(oracle).resolveMarket(1, 1)
      )
        .to.emit(predictionMarket, "MarketResolved")
        .withArgs(1, 1, oracle.address);

      const market = await predictionMarket.getMarket(1);
      expect(market.status).to.equal(1); // Resolved
      expect(market.outcome).to.equal(1);
    });

    it("Should not allow non-oracle to resolve", async function () {
      await expect(
        predictionMarket.connect(user1).resolveMarket(1, 1)
      ).to.be.revertedWith("Not authorized oracle");
    });
  });
});



