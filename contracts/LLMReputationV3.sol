// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";

contract LLMReputationV3 is AccessControl, Pausable {
    bytes32 public constant ADMIN_ROLE  = keccak256("ADMIN_ROLE");
    bytes32 public constant ORACLE_ROLE = keccak256("ORACLE_ROLE");

    struct Score {
        uint64 autoScore;   // 0..100
        uint64 humanScore;  // 0..100
        uint64 weight;      // 0..100
        uint64 lastUpdated; // block.timestamp
        string evidenceURI; // e.g., ipfs://CID/json
    }
    mapping(uint256 => Score) public scores;

    uint256 public decayBpsPerDay = 50; // 0.5%/day

    event ScoresSubmitted(
        uint256 indexed modelId,
        uint64 autoScore,
        uint64 humanScore,
        uint64 weight,
        string evidenceURI
    );

    // V3 event includes SHA-256 of evidence file
    event ScoresSubmittedV3(
        uint256 indexed modelId,
        uint64 autoScore,
        uint64 humanScore,
        uint64 weight,
        string evidenceURI,
        bytes32 evidenceHash
    );

    constructor(address admin, address initialOracle) {
        _grantRole(ADMIN_ROLE, admin);
        _grantRole(ORACLE_ROLE, initialOracle);
        _setRoleAdmin(ORACLE_ROLE, ADMIN_ROLE);
    }

    function pause() external onlyRole(ADMIN_ROLE) { _pause(); }
    function unpause() external onlyRole(ADMIN_ROLE) { _unpause(); }

    function setDecayBpsPerDay(uint256 bps) external onlyRole(ADMIN_ROLE) {
        require(bps <= 10_000, "bps>100%");
        decayBpsPerDay = bps;
    }

    function submitScores(
        uint256 modelId,
        uint64 autoScore,
        uint64 humanScore,
        uint64 weight,
        string calldata evidenceURI
    ) external whenNotPaused onlyRole(ORACLE_ROLE) {
        require(autoScore<=100 && humanScore<=100 && weight<=100, "range");
        scores[modelId] = Score(autoScore, humanScore, weight, uint64(block.timestamp), evidenceURI);
        emit ScoresSubmitted(modelId, autoScore, humanScore, weight, evidenceURI);
    }

    function submitScoresWithEvidence(
        uint256 modelId,
        uint64 autoScore,
        uint64 humanScore,
        uint64 weight,
        string calldata evidenceURI,
        bytes32 evidenceHash
    ) external whenNotPaused onlyRole(ORACLE_ROLE) {
        require(autoScore<=100 && humanScore<=100 && weight<=100, "range");
        scores[modelId] = Score(autoScore, humanScore, weight, uint64(block.timestamp), evidenceURI);
        emit ScoresSubmittedV3(modelId, autoScore, humanScore, weight, evidenceURI, evidenceHash);
    }
}
