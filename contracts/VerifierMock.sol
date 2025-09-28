// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./IGroth16Verifier.sol";

/// @notice Minimal mock verifier for local/dev use only. Always returns `alwaysTrue`.
contract VerifierMock is IGroth16Verifier {
    bool public alwaysTrue;

    constructor(bool _alwaysTrue) {
        alwaysTrue = _alwaysTrue;
    }

    function verifyProof(
        uint256[2] calldata /*a*/,
        uint256[2][2] calldata /*b*/,
        uint256[2] calldata /*c*/,
        uint256[3] calldata /*input*/
    ) external view override returns (bool) {
        return alwaysTrue;
    }
}
