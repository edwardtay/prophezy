// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title DisputeResolution
 * @dev Handles disputes when oracle results are contested
 */
contract DisputeResolution is Ownable {
    constructor() Ownable(msg.sender) {}

    struct Dispute {
        uint256 marketId;
        address disputer;
        uint256 proposedOutcome;
        string reason;
        uint256 stake;
        uint256 timestamp;
        bool resolved;
    }

    struct Vote {
        address voter;
        bool supportsDispute;
        uint256 stake;
    }

    mapping(uint256 => Dispute) public disputes;
    mapping(uint256 => mapping(address => Vote)) public votes;
    mapping(uint256 => uint256) public disputeStakes;
    mapping(uint256 => uint256) public supportStakes;

    uint256 public disputePeriod = 24 hours;
    uint256 public minStake = 0.1 ether;
    uint256 public disputeCounter;

    event DisputeCreated(
        uint256 indexed disputeId,
        uint256 indexed marketId,
        address disputer,
        uint256 proposedOutcome
    );
    event VoteCast(
        uint256 indexed disputeId,
        address voter,
        bool supportsDispute,
        uint256 stake
    );
    event DisputeResolved(
        uint256 indexed disputeId,
        bool disputeUpheld,
        uint256 finalOutcome
    );

    /**
     * @dev Create a dispute for a market resolution
     */
    function createDispute(
        uint256 marketId,
        uint256 proposedOutcome,
        string memory reason
    ) external payable returns (uint256) {
        require(msg.value >= minStake, "Insufficient stake");
        require(bytes(reason).length > 0, "Reason required");

        disputeCounter++;
        uint256 disputeId = disputeCounter;

        disputes[disputeId] = Dispute({
            marketId: marketId,
            disputer: msg.sender,
            proposedOutcome: proposedOutcome,
            reason: reason,
            stake: msg.value,
            timestamp: block.timestamp,
            resolved: false
        });

        disputeStakes[disputeId] = msg.value;

        emit DisputeCreated(disputeId, marketId, msg.sender, proposedOutcome);
        return disputeId;
    }

    /**
     * @dev Vote on a dispute
     */
    function voteOnDispute(
        uint256 disputeId,
        bool supportsDispute
    ) external payable {
        Dispute storage dispute = disputes[disputeId];
        require(!dispute.resolved, "Dispute already resolved");
        require(
            block.timestamp <= dispute.timestamp + disputePeriod,
            "Dispute period ended"
        );
        require(msg.value >= minStake, "Insufficient stake");
        require(
            votes[disputeId][msg.sender].voter == address(0),
            "Already voted"
        );

        votes[disputeId][msg.sender] = Vote({
            voter: msg.sender,
            supportsDispute: supportsDispute,
            stake: msg.value
        });

        if (supportsDispute) {
            disputeStakes[disputeId] = disputeStakes[disputeId] + msg.value;
        } else {
            supportStakes[disputeId] = supportStakes[disputeId] + msg.value;
        }

        emit VoteCast(disputeId, msg.sender, supportsDispute, msg.value);
    }

    /**
     * @dev Resolve dispute after voting period
     */
    function resolveDispute(uint256 disputeId) external {
        Dispute storage dispute = disputes[disputeId];
        require(!dispute.resolved, "Already resolved");
        require(
            block.timestamp > dispute.timestamp + disputePeriod,
            "Dispute period ongoing"
        );

        bool disputeUpheld = disputeStakes[disputeId] > supportStakes[disputeId];
        uint256 finalOutcome = disputeUpheld
            ? dispute.proposedOutcome
            : 0; // 0 means original resolution stands

        dispute.resolved = true;

        // Distribute rewards to winning side
        if (disputeUpheld) {
            // Disputers win - distribute from support stakes
            // Simplified - in production, distribute proportionally
        } else {
            // Original resolution upheld - distribute from dispute stakes
        }

        emit DisputeResolved(disputeId, disputeUpheld, finalOutcome);
    }

    /**
     * @dev Set minimum stake for disputes
     */
    function setMinStake(uint256 _minStake) external onlyOwner {
        minStake = _minStake;
    }

    /**
     * @dev Set dispute period
     */
    function setDisputePeriod(uint256 _period) external onlyOwner {
        disputePeriod = _period;
    }
}

