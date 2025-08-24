// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./IVerifier.sol";

contract MockVerifier is IVerifier {
    function verifyTx(Proof calldata /*proof*/, uint256[10] calldata /*input*/) external pure returns (bool) {
        return true; // accept any proof for Phase 1 wiring
    }
}
