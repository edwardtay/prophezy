// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@redstone-finance/evm-connector/contracts/core/RedstoneConsumerNumericBase.sol";

/**
 * @title RedstoneOracle
 * @dev Integration with Redstone oracle for fast market resolution (15 minutes)
 * Uses Redstone's pull model with calldata - data is passed via transaction calldata
 */
contract RedstoneOracle is Ownable, RedstoneConsumerNumericBase {

    // Market resolution data
    struct Resolution {
        uint256 marketId;
        uint256 outcome;
        uint256 timestamp;
        bool resolved;
        address resolver;
        uint256 value; // Store the oracle value for reference
    }

    mapping(uint256 => Resolution) public resolutions;
    mapping(address => bool) public authorizedResolvers;

    event MarketResolved(
        uint256 indexed marketId,
        uint256 outcome,
        address resolver,
        uint256 timestamp,
        uint256 value
    );

    modifier onlyAuthorized() {
        require(
            authorizedResolvers[msg.sender] || msg.sender == owner(),
            "Not authorized"
        );
        _;
    }

    constructor() Ownable(msg.sender) {
        // No need for external oracle address - Redstone uses calldata
    }

    /**
     * @dev Get the data service ID for Redstone
     * @return The Redstone data service ID
     */
    function getDataServiceId() public pure override returns (string memory) {
        return "redstone-primary-prod";
    }

    /**
     * @dev Get authorized signer index (simplified - in production, implement proper signer management)
     * @param receivedSigner The signer address
     * @return Index of the signer
     */
    function getAuthorisedSignerIndex(address receivedSigner) public pure override returns (uint8) {
        // Simplified implementation - in production, maintain a mapping of authorized signers
        // For now, return 0 for any signer (not secure for production)
        return 0;
    }

    /**
     * @dev Get the minimum number of unique signers required
     * @return The threshold number of signers
     */
    function getUniqueSignersThreshold() public pure override returns (uint8) {
        // Require at least 1 signer (in production, use higher threshold for security)
        return 1;
    }

    /**
     * @dev Resolve market using Redstone oracle (fast - 15 minutes)
     * @param marketId The market ID to resolve
     * @param dataFeedId The Redstone data feed ID (e.g., "ETH" -> bytes32)
     * @param threshold The threshold value to compare against
     * @notice Redstone data must be passed via calldata using Redstone's SDK
     * @notice The caller must prepare calldata with Redstone price data before calling
     */
    function resolveMarketFast(
        uint256 marketId,
        bytes32 dataFeedId,
        uint256 threshold
    ) external onlyAuthorized returns (uint256) {
        // Extract price from Redstone calldata using RedstoneConsumerNumericBase
        // This reads the price from the calldata that was prepared by Redstone SDK
        uint256 value = getOracleNumericValueFromTxMsg(dataFeedId);

        uint256 outcome = value >= threshold ? 1 : 2; // 1 = yes, 2 = no

        resolutions[marketId] = Resolution({
            marketId: marketId,
            outcome: outcome,
            timestamp: block.timestamp,
            resolved: true,
            resolver: msg.sender,
            value: value
        });

        emit MarketResolved(marketId, outcome, msg.sender, block.timestamp, value);
        return outcome;
    }

    /**
     * @dev Get resolution for a market
     */
    function getResolution(
        uint256 marketId
    ) external view returns (Resolution memory) {
        return resolutions[marketId];
    }

    /**
     * @dev Check if market is resolved
     */
    function isResolved(uint256 marketId) external view returns (bool) {
        return resolutions[marketId].resolved;
    }

    /**
     * @dev Authorize resolver addresses
     */
    function authorizeResolver(address resolver, bool authorized) external onlyOwner {
        authorizedResolvers[resolver] = authorized;
    }
}

