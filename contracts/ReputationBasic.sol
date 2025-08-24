// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract ReputationBasic {
    struct Feedback { uint256 score; address user; uint256 timestamp; }

    mapping(address => uint256) public reputationSum;
    mapping(address => uint256) public feedbackCount;
    mapping(address => Feedback[]) public feedbacks;

    event FeedbackSubmitted(address indexed model, address indexed user, uint256 score);

    function submitFeedback(address model, uint256 score) external {
        require(score <= 100, "Score must be 0..100");
        feedbacks[model].push(Feedback(score, msg.sender, block.timestamp));
        reputationSum[model] += score;
        feedbackCount[model] += 1;
        emit FeedbackSubmitted(model, msg.sender, score);
    }

    function getAverage(address model) external view returns (uint256 avgTimes100) {
        uint256 cnt = feedbackCount[model];
        if (cnt == 0) return 0;
        return (reputationSum[model] * 100) / cnt;
    }
}
