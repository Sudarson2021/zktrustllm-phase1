// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./IVerifier.sol";

contract ReputationWithZK {
    IVerifier public verifier;

    struct Feedback { uint256 scoreHash; address user; uint256 timestamp; }
    mapping(address => uint256) public reputationSum;   // sum of revealed scores (optional)
    mapping(address => uint256) public feedbackCount;
    mapping(address => Feedback[]) public feedbacks;

    event FeedbackSubmitted(address indexed model, address indexed user, uint256 scoreHash);

    constructor(address _verifier) { verifier = IVerifier(_verifier); }

    // Match the verifier: uint256[10] inputs; use input[0] as 'bound' policy (100)
    function submitFeedbackZK(
        address model,
        IVerifier.Proof memory proof,
        uint256[10] memory input,
        uint256 scoreHash,       // keccak256(abi.encode(score)) computed off-chain
        uint256 revealedScore    // 0 to keep private; else must be <= 100
    ) external {
        require(input[0] == 100, "Bound must be 100");
        require(verifier.verifyTx(proof, input), "Invalid ZK proof");

        feedbacks[model].push(Feedback(scoreHash, msg.sender, block.timestamp));
        feedbackCount[model] += 1;

        if (revealedScore > 0) {
            require(revealedScore <= 100, "Bad reveal");
            reputationSum[model] += revealedScore;
        }

        emit FeedbackSubmitted(model, msg.sender, scoreHash);
    }

    function getAverage(address model) external view returns (uint256 avgTimes100) {
        uint256 cnt = feedbackCount[model];
        if (cnt == 0) return 0;
        return (reputationSum[model] * 100) / cnt;
    }
}
