// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@chainlink/contracts/src/v0.8/shared/interfaces/AggregatorV3Interface.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title ChainlinkFallback
 * @dev Chainlink oracle integration for high-value markets requiring security
 */
contract ChainlinkFallback is Ownable {
    constructor(address _chainlinkFeed) Ownable(msg.sender) {
        priceFeed = AggregatorV3Interface(_chainlinkFeed);
    }
    
    AggregatorV3Interface internal priceFeed;

    struct MarketResolution {
        uint256 marketId;
        uint256 outcome;
        uint256 timestamp;
        bool resolved;
        bool usingChainlink;
    }

    mapping(uint256 => MarketResolution) public resolutions;
    mapping(address => bool) public authorizedOracles;

    event MarketResolvedWithChainlink(
        uint256 indexed marketId,
        uint256 outcome,
        uint256 timestamp
    );

    modifier onlyAuthorized() {
        require(
            authorizedOracles[msg.sender] || msg.sender == owner(),
            "Not authorized"
        );
        _;
    }

    /**
     * @dev Resolve market using Chainlink (secure but slower)
     * Used as fallback for high-value markets
     */
    function resolveMarketSecure(
        uint256 marketId,
        int256 threshold
    ) external onlyAuthorized returns (uint256) {
        (
            uint80 roundId,
            int256 price,
            uint256 startedAt,
            uint256 updatedAt,
            uint80 answeredInRound
        ) = priceFeed.latestRoundData();

        require(updatedAt > 0, "Chainlink price not available");
        require(answeredInRound >= roundId, "Stale price");

        uint256 outcome = price >= threshold ? 1 : 2;

        resolutions[marketId] = MarketResolution({
            marketId: marketId,
            outcome: outcome,
            timestamp: block.timestamp,
            resolved: true,
            usingChainlink: true
        });

        emit MarketResolvedWithChainlink(marketId, outcome, block.timestamp);
        return outcome;
    }

    /**
     * @dev Get latest price from Chainlink
     */
    function getLatestPrice() external view returns (int256) {
        (, int256 price, , , ) = priceFeed.latestRoundData();
        return price;
    }

    /**
     * @dev Authorize oracle addresses
     */
    function authorizeOracle(address oracle, bool authorized) external onlyOwner {
        authorizedOracles[oracle] = authorized;
    }
}

