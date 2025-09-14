// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title LLMReputation
 * @notice Minimal on-chain reputation registry for LLM models.
 *         An off-chain "oracle" account posts aggregated KPI scores
 *         (autoScore and humanScore, both 0-100 scaled) per model.
 *         Includes a simple linear time decay to keep scores fresh.
 */
contract LLMReputation {
    struct Model {
        string name;
        address owner;
        bool exists;
    }

    struct Scores {
        uint64 autoScore;   // 0..100 (scaled integer)
        uint64 humanScore;  // 0..100 (scaled integer)
        uint64 weight;      // e.g., number of samples evaluated
        uint256 lastUpdated;
        string evidenceURI; // e.g., ipfs://CID or https://... to CSV/plots
    }

    address public admin;
    address public oracle;

    // Linear decay per day in basis points (1e-4). e.g., 50 = 0.5%/day
    uint256 public decayBpsPerDay = 50;

    mapping(uint256 => Model) public models;
    mapping(uint256 => Scores) public scores;

    event ModelRegistered(uint256 indexed modelId, string name, address owner);
    event OracleChanged(address indexed newOracle);
    event ScoresSubmitted(uint256 indexed modelId, uint64 autoScore, uint64 humanScore, uint64 weight, string evidenceURI);

    modifier onlyAdmin() {
        require(msg.sender == admin, "not admin");
        _;
    }

    modifier onlyOracle() {
        require(msg.sender == oracle, "not oracle");
        _;
    }

    constructor(address _oracle) {
        admin = msg.sender;
        oracle = _oracle;
    }

    function setOracle(address _oracle) external onlyAdmin {
        oracle = _oracle;
        emit OracleChanged(_oracle);
    }

    function setDecayBpsPerDay(uint256 bps) external onlyAdmin {
        require(bps <= 10000, "too high");
        decayBpsPerDay = bps;
    }

    function registerModel(uint256 modelId, string calldata name, address owner) external onlyAdmin {
        require(!models[modelId].exists, "exists");
        models[modelId] = Model({name: name, owner: owner, exists: true});
        emit ModelRegistered(modelId, name, owner);
    }

    function submitScores(
        uint256 modelId,
        uint64 autoScore,
        uint64 humanScore,
        uint64 weight,
        string calldata evidenceURI
    ) external onlyOracle {
        require(models[modelId].exists, "unknown model");
        require(autoScore <= 100 && humanScore <= 100, "score out of range");
        scores[modelId] = Scores({
            autoScore: autoScore,
            humanScore: humanScore,
            weight: weight,
            lastUpdated: block.timestamp,
            evidenceURI: evidenceURI
        });
        emit ScoresSubmitted(modelId, autoScore, humanScore, weight, evidenceURI);
    }

    /// @notice Returns a decayed blended reputation in [0,100].
    ///         Blend = 0.7*auto + 0.3*human (you can change weights off-chain)
    ///         Decay: linear reduction by decayBpsPerDay per day since last update.
    function reputation(uint256 modelId) public view returns (uint256 rep) {
        Scores memory s = scores[modelId];
        if (s.lastUpdated == 0) return 0;

        uint256 base = (uint256(s.autoScore) * 70 + uint256(s.humanScore) * 30) / 100;
        uint256 daysElapsed = (block.timestamp - s.lastUpdated) / 1 days;
        uint256 bpsTotal = daysElapsed * decayBpsPerDay; // basis points
        if (bpsTotal >= 10000) return 0; // fully decayed

        uint256 decayed = (base * (10000 - bpsTotal)) / 10000;
        return decayed;
    }

    function rawScores(uint256 modelId) external view returns (Scores memory) {
        return scores[modelId];
    }
}
