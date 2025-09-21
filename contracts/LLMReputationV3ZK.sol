// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./LLMReputationV3.sol";
import "./Verifier_groth16.sol"; // contract Groth16Verifier

/// @notice ZK wrapper that requires a valid Groth16 proof for autoScore.
///         Your circuit's public signals (from `public.json`) are ordered:
///         [ ok, n, autoScore ]  e.g. ["1","25","92"].
contract LLMReputationV3ZK is LLMReputationV3 {
    Groth16Verifier public verifier;
    event ScoresSubmittedZK(uint256 indexed modelId);

    constructor(address admin, address oracle, address verifierAddr)
        LLMReputationV3(admin, oracle)
    {
        verifier = Groth16Verifier(verifierAddr);
    }

    /// @param publicSignals must be [ok, n, autoScore]
    function submitScoresZK(
      uint256 modelId,
      uint64 autoScore,
      uint64 humanScore,
      uint64 weight,
      string calldata evidenceURI,
      bytes32 evidenceHash,
      uint256[2] calldata a,
      uint256[2][2] calldata b,
      uint256[2] calldata c,
      uint256[3] calldata publicSignals
    ) external whenNotPaused onlyRole(ORACLE_ROLE) {
        // basic bounds
        require(autoScore <= 100 && humanScore <= 100 && weight <= 100, "range");

        // must pass Groth16 verification
        require(verifier.verifyProof(a, b, c, publicSignals), "bad proof");

        // decode public signals: [ok, n, autoScorePublic]
        require(publicSignals[0] == 1, "ok!=1");
        require(publicSignals[1] == 25, "n!=25"); // matches your circuit main(N=25)
        require(publicSignals[2] == autoScore, "autoScore mismatch");

        // store + emit v3-style event with evidence hash
        scores[modelId] = Score(autoScore, humanScore, weight, uint64(block.timestamp), evidenceURI);
        emit ScoresSubmittedV3(modelId, autoScore, humanScore, weight, evidenceURI, evidenceHash);
        emit ScoresSubmittedZK(modelId);
    }
}
