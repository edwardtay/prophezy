// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title OracleRouter
 * @dev Central registry for oracle data feeds
 * Allows registration of feedIds and provides price data
 */
contract OracleRouter is Ownable {
    struct Feed {
        bytes32 feedId;
        address priceFeed; // Address of the price feed contract (Chainlink, Redstone, etc.)
        bool active;
        uint256 lastUpdate;
    }

    mapping(bytes32 => Feed) public feeds;
    mapping(bytes32 => uint256) public prices; // Cache of latest prices
    bytes32[] public feedIds;

    event FeedRegistered(bytes32 indexed feedId, address indexed priceFeed);
    event FeedUpdated(bytes32 indexed feedId, uint256 price, uint256 timestamp);
    event FeedDeactivated(bytes32 indexed feedId);

    constructor() Ownable(msg.sender) {}

    /**
     * @dev Register a new feed
     * @param feedId The feed identifier (e.g., "ETH", "BTC")
     * @param priceFeed Address of the price feed contract (can be zero for manual updates)
     */
    function registerFeed(bytes32 feedId, address priceFeed) external onlyOwner {
        require(feeds[feedId].feedId == bytes32(0), "Feed already exists");
        
        feeds[feedId] = Feed({
            feedId: feedId,
            priceFeed: priceFeed,
            active: true,
            lastUpdate: block.timestamp
        });
        
        feedIds.push(feedId);
        emit FeedRegistered(feedId, priceFeed);
    }

    /**
     * @dev Update price for a feed (can be called by owner or priceFeed contract)
     */
    function updatePrice(bytes32 feedId, uint256 price) external {
        require(feeds[feedId].feedId != bytes32(0), "Feed does not exist");
        require(
            msg.sender == owner() || msg.sender == feeds[feedId].priceFeed,
            "Not authorized"
        );
        require(feeds[feedId].active, "Feed is inactive");

        prices[feedId] = price;
        feeds[feedId].lastUpdate = block.timestamp;
        emit FeedUpdated(feedId, price, block.timestamp);
    }

    /**
     * @dev Update price from Chainlink Aggregator (can be called by anyone)
     * This allows Chainlink price feeds to update prices automatically
     */
    function updatePriceFromChainlink(bytes32 feedId) external {
        require(feeds[feedId].feedId != bytes32(0), "Feed does not exist");
        require(feeds[feedId].active, "Feed is inactive");
        require(feeds[feedId].priceFeed != address(0), "No Chainlink feed configured");

        // Call Chainlink AggregatorV3Interface
        (bool success, bytes memory data) = feeds[feedId].priceFeed.call(
            abi.encodeWithSignature("latestRoundData()")
        );
        require(success, "Chainlink call failed");

        // Decode the response: (uint80 roundId, int256 price, uint256 startedAt, uint256 updatedAt, uint80 answeredInRound)
        (uint80 roundId, int256 price, , uint256 updatedAt, uint80 answeredInRound) = 
            abi.decode(data, (uint80, int256, uint256, uint256, uint80));

        require(updatedAt > 0, "Chainlink price not available");
        require(answeredInRound >= roundId, "Stale Chainlink price");

        // Convert int256 to uint256 (assuming price is positive)
        require(price > 0, "Invalid Chainlink price");
        prices[feedId] = uint256(price);
        feeds[feedId].lastUpdate = block.timestamp;
        emit FeedUpdated(feedId, uint256(price), block.timestamp);
    }

    /**
     * @dev Get price for a feed
     */
    function getPrice(bytes32 feedId) external view returns (uint256) {
        require(feeds[feedId].feedId != bytes32(0), "Feed does not exist");
        require(feeds[feedId].active, "Feed is inactive");
        return prices[feedId];
    }

    /**
     * @dev Check if a feed exists and is valid
     */
    function isValidFeed(bytes32 feedId) external view returns (bool) {
        return feeds[feedId].feedId != bytes32(0) && feeds[feedId].active;
    }

    /**
     * @dev Check if a feed exists
     */
    function hasFeed(bytes32 feedId) external view returns (bool) {
        return feeds[feedId].feedId != bytes32(0);
    }

    /**
     * @dev Deactivate a feed
     */
    function deactivateFeed(bytes32 feedId) external onlyOwner {
        require(feeds[feedId].feedId != bytes32(0), "Feed does not exist");
        feeds[feedId].active = false;
        emit FeedDeactivated(feedId);
    }

    /**
     * @dev Get all registered feed IDs
     */
    function getAllFeedIds() external view returns (bytes32[] memory) {
        return feedIds;
    }

    /**
     * @dev Get feed count
     */
    function getFeedCount() external view returns (uint256) {
        return feedIds.length;
    }
}

