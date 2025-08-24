// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/AccessControl.sol";

interface IVerifier {
    function verifyTx(
        uint[2] calldata a,
        uint[2][2] calldata b,
        uint[2] calldata c,
        uint[10] calldata input
    ) external view returns (bool);
}

contract ReputationManager is AccessControl {
    bytes32 public constant ORACLE_ROLE = keccak256("ORACLE_ROLE");

    struct Stats {
        uint256 humanSum;     // sum of human ratings scaled to 0..10000
        uint256 humanCount;   // number of ratings
        uint256 autoScoreBP;  // auto score in basis points (0..10000)
    }

    IVerifier public verifier;
    mapping(bytes32 => Stats) public stats;

    event AutoScorePosted(bytes32 indexed modelId, uint256 autoScoreBP);
    event HumanFeedback(bytes32 indexed modelId, uint8 rating, bytes32 commitment);

    constructor(address _verifier, address oracle) {
        verifier = IVerifier(_verifier);
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(ORACLE_ROLE, oracle);
    }

    function postAutoScore(bytes32 modelId, uint256 autoScoreBP) external onlyRole(ORACLE_ROLE) {
        require(autoScoreBP <= 10000, "autoScore out of range");
        stats[modelId].autoScoreBP = autoScoreBP;
        emit AutoScorePosted(modelId, autoScoreBP);
    }

    function submitHumanFeedbackZK(
        bytes32 modelId,
        uint8 rating,
        bytes32 commitment,
        uint[2] calldata a,
        uint[2][2] calldata b,
        uint[2] calldata c,
        uint[10] calldata input
    ) external {
        require(verifier.verifyTx(a, b, c, input), "invalid proof");
        require(rating >= 1 && rating <= 5, "rating 1..5");

        Stats storage s = stats[modelId];
        // map 1..5 -> 2000..10000
        s.humanSum += (uint256(rating) * 10000) / 5;
        s.humanCount += 1;

        emit HumanFeedback(modelId, rating, commitment);
    }

    function getReputationBP(bytes32 modelId)
        external view
        returns (uint256 Rbp, uint256 humanBP, uint256 autoBP)
    {
        Stats storage s = stats[modelId];
        humanBP = (s.humanCount == 0) ? 0 : (s.humanSum / s.humanCount);
        autoBP  = s.autoScoreBP;

        uint256 wHumanBP = 5000; // 50%
        uint256 wAutoBP  = 5000; // 50%
        Rbp = (humanBP * wHumanBP + autoBP * wAutoBP) / 10000;
    }
}
