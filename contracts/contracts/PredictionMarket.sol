// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./ChainlinkFallback.sol";
import "./DisputeResolution.sol";

/**
 * @title PredictionMarket
 * @dev Core prediction market contract with Chainlink oracle integration
 * Oracle Resolution: 24-48hrs (UMA) vs Chainlink (secure)
 */
contract PredictionMarket is Ownable, ReentrancyGuard {

    struct Market {
        uint256 id;
        string question;
        string category;
        uint256 endTime;
        uint256 resolutionTime;
        uint256 totalLiquidity;
        MarketStatus status;
        uint256 outcome; // 0 = unresolved, 1 = yes, 2 = no
        address creator;
        uint256 platformFee; // Basis points (e.g., 250 = 2.5%)
    }

    enum MarketStatus {
        Active,
        Resolved,
        Cancelled
    }

    struct Position {
        uint256 amount;
        bool side; // true = yes, false = no
    }

    mapping(uint256 => Market) public markets;
    mapping(uint256 => mapping(address => Position)) public positions;
    mapping(uint256 => mapping(bool => uint256)) public liquidity; // marketId => side => amount
    mapping(address => bool) public authorizedOracles;
    
    // Oracle integrations
    ChainlinkFallback public chainlinkFallback;
    DisputeResolution public disputeResolution;
    
    // Oracle selection: 0 = Chainlink (secure)
    mapping(uint256 => uint8) public marketOracleType;
    mapping(uint256 => uint256) public marketValueThreshold; // For oracle comparison

    uint256 public marketCounter;
    uint256 public platformFeeBps = 250; // 2.5% default
    uint256 public constant MAX_FEE_BPS = 1000; // 10% max

    event MarketCreated(
        uint256 indexed marketId,
        address indexed creator,
        string question,
        uint256 endTime
    );
    event PositionOpened(
        uint256 indexed marketId,
        address indexed trader,
        bool side,
        uint256 amount
    );
    event MarketResolved(
        uint256 indexed marketId,
        uint256 outcome,
        address resolver
    );
    event OracleAuthorized(address indexed oracle, bool authorized);

    modifier onlyOracle() {
        require(authorizedOracles[msg.sender], "Not authorized oracle");
        _;
    }

    modifier validMarket(uint256 marketId) {
        require(markets[marketId].id != 0, "Market does not exist");
        _;
    }

    constructor(
        address _chainlinkFallback,
        address _disputeResolution
    ) Ownable(msg.sender) {
        if (_chainlinkFallback != address(0)) {
            chainlinkFallback = ChainlinkFallback(_chainlinkFallback);
        }
        if (_disputeResolution != address(0)) {
            disputeResolution = DisputeResolution(_disputeResolution);
        }
    }

    /**
     * @dev Create a new prediction market
     * @param oracleType 0 = Chainlink (secure)
     * @param valueThreshold Threshold value for oracle comparison
     */
    function createMarket(
        string memory question,
        string memory category,
        uint256 duration,
        uint256 resolutionDelay,
        uint8 oracleType,
        uint256 valueThreshold
    ) external returns (uint256) {
        require(bytes(question).length > 0, "Question required");
        require(duration > 0, "Invalid duration");
        require(oracleType == 0, "Invalid oracle type");

        marketCounter++;
        uint256 marketId = marketCounter;
        uint256 endTime = block.timestamp + duration;

        markets[marketId] = Market({
            id: marketId,
            question: question,
            category: category,
            endTime: endTime,
            resolutionTime: endTime + resolutionDelay,
            totalLiquidity: 0,
            status: MarketStatus.Active,
            outcome: 0,
            creator: msg.sender,
            platformFee: platformFeeBps
        });

        marketOracleType[marketId] = oracleType;
        marketValueThreshold[marketId] = valueThreshold;

        emit MarketCreated(marketId, msg.sender, question, endTime);
        return marketId;
    }

    /**
     * @dev Open a position in a market
     */
    function openPosition(
        uint256 marketId,
        bool side
    ) external payable validMarket(marketId) nonReentrant {
        Market storage market = markets[marketId];
        require(market.status == MarketStatus.Active, "Market not active");
        require(block.timestamp < market.endTime, "Market ended");
        require(msg.value > 0, "Amount must be greater than 0");

        uint256 fee = (msg.value * market.platformFee) / 10000;
        uint256 amount = msg.value - fee;

        Position storage position = positions[marketId][msg.sender];
        position.amount = position.amount + amount;
        position.side = side;

        liquidity[marketId][side] = liquidity[marketId][side] + amount;
        market.totalLiquidity = market.totalLiquidity + amount;

        emit PositionOpened(marketId, msg.sender, side, amount);
    }

    /**
     * @dev Resolve market using Chainlink
     */
    function resolveMarketSecure(
        uint256 marketId,
        int256 threshold
    ) external onlyOracle validMarket(marketId) {
        Market storage market = markets[marketId];
        require(market.status == MarketStatus.Active, "Market not active");
        require(block.timestamp >= market.endTime, "Market not ended");
        require(
            address(chainlinkFallback) != address(0),
            "Chainlink fallback not configured"
        );
        require(marketOracleType[marketId] == 0, "Invalid oracle type");

        uint256 outcome = chainlinkFallback.resolveMarketSecure(
            marketId,
            threshold
        );

        market.status = MarketStatus.Resolved;
        market.outcome = outcome;

        emit MarketResolved(marketId, outcome, msg.sender);
    }

    /**
     * @dev Resolve market manually (fallback)
     */
    function resolveMarket(
        uint256 marketId,
        uint256 outcome
    ) external onlyOracle validMarket(marketId) {
        Market storage market = markets[marketId];
        require(market.status == MarketStatus.Active, "Market not active");
        require(block.timestamp >= market.endTime, "Market not ended");
        require(outcome == 1 || outcome == 2, "Invalid outcome");

        market.status = MarketStatus.Resolved;
        market.outcome = outcome;

        emit MarketResolved(marketId, outcome, msg.sender);
    }

    /**
     * @dev Claim winnings after market resolution
     */
    function claimWinnings(
        uint256 marketId
    ) external validMarket(marketId) nonReentrant {
        Market storage market = markets[marketId];
        require(market.status == MarketStatus.Resolved, "Market not resolved");
        require(market.outcome != 0, "Outcome not set");

        Position storage position = positions[marketId][msg.sender];
        require(position.amount > 0, "No position");

        bool won = (market.outcome == 1 && position.side) ||
                   (market.outcome == 2 && !position.side);

        if (won) {
            uint256 totalLiquidity = liquidity[marketId][true] +
                liquidity[marketId][false];
            uint256 userShare = (position.amount * totalLiquidity) /
                liquidity[marketId][position.side];

            position.amount = 0;
            (bool success, ) = msg.sender.call{value: userShare}("");
            require(success, "Transfer failed");
        } else {
            position.amount = 0;
        }
    }

    /**
     * @dev Authorize oracle addresses
     */
    function authorizeOracle(address oracle, bool authorized) external onlyOwner {
        authorizedOracles[oracle] = authorized;
        emit OracleAuthorized(oracle, authorized);
    }

    /**
     * @dev Set platform fee
     */
    function setPlatformFee(uint256 feeBps) external onlyOwner {
        require(feeBps <= MAX_FEE_BPS, "Fee too high");
        platformFeeBps = feeBps;
    }

    /**
     * @dev Withdraw platform fees
     */
    function withdrawFees() external onlyOwner {
        uint256 balance = address(this).balance;
        (bool success, ) = owner().call{value: balance}("");
        require(success, "Withdrawal failed");
    }

    /**
     * @dev Get market details
     */
    function getMarket(
        uint256 marketId
    ) external view returns (Market memory) {
        return markets[marketId];
    }

    /**
     * @dev Get user position
     */
    function getUserPosition(
        uint256 marketId,
        address user
    ) external view returns (Position memory) {
        return positions[marketId][user];
    }

    /**
     * @dev Get market liquidity
     */
    function getMarketLiquidity(
        uint256 marketId
    ) external view returns (uint256 yesLiquidity, uint256 noLiquidity) {
        yesLiquidity = liquidity[marketId][true];
        noLiquidity = liquidity[marketId][false];
    }
}

