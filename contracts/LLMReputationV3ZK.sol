// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./IGroth16Verifier.sol";

/**
 * @notice Self-contained Phase 4 core (no external imports).
 * - Owner can pause/unpause and grant/revoke oracle role.
 * - Oracles can submit a model's latest score after a ZK proof verifies.
 */
contract LLMReputationV3ZK {
    // --- minimal Ownable + Pausable ---
    address public owner;
    bool    public paused;

    modifier onlyOwner() {
        require(msg.sender == owner, "not owner");
        _;
    }
    modifier whenNotPaused() {
        require(!paused, "paused");
        _;
    }
    // --- simple ORACLE role ---
    mapping(address => bool) public isOracle;
    event OracleSet(address indexed oracle, bool allowed);

    // --- verifier ---
    IGroth16Verifier public verifier;

    // --- score storage ---
    struct Score {
        uint64 autoScore;
        uint64 humanScore;
        uint64 weight;
        string evidenceURI;
        bytes32 evidenceHash;
    }
    mapping(uint256 => Score) public scores;

    function hasScore(uint256 modelId) external view returns (bool) {
        Score memory s = scores[modelId];
        return bytes(s.evidenceURI).length != 0 || s.evidenceHash != bytes32(0);
    }


    event ScoreSubmitted(
        uint256 indexed modelId,
        uint64 autoScore,
        uint64 humanScore,
        uint64 weight,
        string evidenceURI,
        bytes32 evidenceHash
    );
    constructor(address _owner, address _oracle, address _verifier) {
        owner = _owner;
        isOracle[_oracle] = true;
        verifier = IGroth16Verifier(_verifier);
        emit OracleSet(_oracle, true);
    }

    // --- admin ---
    function setOracle(address _oracle, bool allowed) external onlyOwner {
        isOracle[_oracle] = allowed;
        emit OracleSet(_oracle, allowed);
    }

    function pause() external onlyOwner { paused = true; }
    function unpause() external onlyOwner { paused = false; }
    // --- main action ---
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
    ) external whenNotPaused {
        require(isOracle[msg.sender], "not oracle");

        // 3 public inputs for the verifier (fixed-size); pass directly
        require(verifier.verifyProof(a, b, c, publicSignals), "ZK verify failed");
        scores[modelId] = Score({
            autoScore: autoScore,
            humanScore: humanScore,
            weight: weight,
            evidenceURI: evidenceURI,
            evidenceHash: evidenceHash
        });

        emit ScoreSubmitted(
            modelId, autoScore, humanScore, weight, evidenceURI, evidenceHash
        );
    }
    // Returns tuple + a boolean indicating if a score exists
    function getScore(uint256 modelId) external view returns (
        bool exists,
        uint64 autoScore,
        uint64 humanScore,
        uint64 weight,
        string memory evidenceURI,
        bytes32 evidenceHash
    ) {
        Score memory s = scores[modelId];
        exists = bytes(s.evidenceURI).length != 0 || s.evidenceHash != bytes32(0);
        return (exists, s.autoScore, s.humanScore, s.weight, s.evidenceURI, s.evidenceHash);
    }
}
