// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "./PredictionMarket.sol";

/**
 * @title LiquidityAggregator
 * @dev Aggregates liquidity across multiple prediction markets
 */
contract LiquidityAggregator is Ownable {
    PredictionMarket public predictionMarket;

    struct AggregatedPosition {
        uint256 totalYes;
        uint256 totalNo;
        uint256[] marketIds;
    }

    mapping(address => AggregatedPosition) public userPositions;
    mapping(uint256 => bool) public supportedMarkets;

    event LiquidityAggregated(
        address indexed user,
        uint256[] marketIds,
        uint256 totalYes,
        uint256 totalNo
    );

    constructor(address _predictionMarket) Ownable(msg.sender) {
        predictionMarket = PredictionMarket(_predictionMarket);
    }

    /**
     * @dev Open positions across multiple markets
     */
    function openAggregatedPosition(
        uint256[] memory marketIds,
        bool[] memory sides,
        uint256[] memory amounts
    ) external payable {
        require(
            marketIds.length == sides.length &&
                sides.length == amounts.length,
            "Array length mismatch"
        );

        uint256 totalAmount = 0;
        for (uint256 i = 0; i < amounts.length; i++) {
            totalAmount += amounts[i];
        }
        require(msg.value >= totalAmount, "Insufficient funds");

        uint256 remainingValue = msg.value;

        for (uint256 i = 0; i < marketIds.length; i++) {
            require(supportedMarkets[marketIds[i]], "Market not supported");
            
            // Transfer amount to prediction market
            (bool success, ) = address(predictionMarket).call{
                value: amounts[i]
            }(
                abi.encodeWithSignature(
                    "openPosition(uint256,bool)",
                    marketIds[i],
                    sides[i]
                )
            );
            require(success, "Position open failed");

            remainingValue -= amounts[i];

            // Update aggregated position
            AggregatedPosition storage aggPos = userPositions[msg.sender];
            if (sides[i]) {
                aggPos.totalYes += amounts[i];
            } else {
                aggPos.totalNo += amounts[i];
            }
            aggPos.marketIds.push(marketIds[i]);
        }

        // Refund excess
        if (remainingValue > 0) {
            (bool refundSuccess, ) = msg.sender.call{value: remainingValue}("");
            require(refundSuccess, "Refund failed");
        }

        emit LiquidityAggregated(
            msg.sender,
            marketIds,
            userPositions[msg.sender].totalYes,
            userPositions[msg.sender].totalNo
        );
    }

    /**
     * @dev Add market to aggregation pool
     */
    function addMarket(uint256 marketId) external onlyOwner {
        supportedMarkets[marketId] = true;
    }

    /**
     * @dev Remove market from aggregation pool
     */
    function removeMarket(uint256 marketId) external onlyOwner {
        supportedMarkets[marketId] = false;
    }

    /**
     * @dev Get aggregated position for user
     */
    function getAggregatedPosition(
        address user
    ) external view returns (AggregatedPosition memory) {
        return userPositions[user];
    }
}

