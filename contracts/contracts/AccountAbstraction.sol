// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/cryptography/EIP712.sol";

/**
 * @title AccountAbstraction
 * @dev ERC-4337 compatible account abstraction for gasless transactions
 */
contract AccountAbstraction is EIP712 {
    using ECDSA for bytes32;

    struct UserOperation {
        address sender;
        uint256 nonce;
        bytes callData;
        bytes signature;
    }

    mapping(address => uint256) public nonces;
    mapping(address => bool) public paymasters;

    bytes32 private constant USER_OP_TYPEHASH =
        keccak256(
            "UserOperation(address sender,uint256 nonce,bytes callData)"
        );

    event UserOperationExecuted(
        address indexed sender,
        uint256 nonce,
        bool success
    );
    event PaymasterAuthorized(address indexed paymaster, bool authorized);

    constructor() EIP712("AccountAbstraction", "1") {}

    /**
     * @dev Execute user operation with signature verification
     */
    function executeUserOperation(
        UserOperation memory userOp
    ) external returns (bool) {
        require(
            verifySignature(userOp),
            "Invalid signature"
        );
        require(userOp.nonce == nonces[userOp.sender], "Invalid nonce");

        nonces[userOp.sender]++;

        (bool success, ) = userOp.sender.call(userOp.callData);

        emit UserOperationExecuted(userOp.sender, userOp.nonce, success);
        return success;
    }

    /**
     * @dev Verify user operation signature
     */
    function verifySignature(
        UserOperation memory userOp
    ) internal view returns (bool) {
        bytes32 structHash = keccak256(
            abi.encode(
                USER_OP_TYPEHASH,
                userOp.sender,
                userOp.nonce,
                keccak256(userOp.callData)
            )
        );

        bytes32 hash = _hashTypedDataV4(structHash);
        address signer = hash.recover(userOp.signature);

        return signer == userOp.sender;
    }

    /**
     * @dev Authorize paymaster for gasless transactions
     */
    function authorizePaymaster(address paymaster, bool authorized) external {
        paymasters[paymaster] = authorized;
        emit PaymasterAuthorized(paymaster, authorized);
    }

    /**
     * @dev Get nonce for address
     */
    function getNonce(address account) external view returns (uint256) {
        return nonces[account];
    }
}



