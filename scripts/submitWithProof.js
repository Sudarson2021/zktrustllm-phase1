const ReputationWithZK = artifacts.require("ReputationWithZK");

module.exports = async function (callback) {
  try {
    const rep = await ReputationWithZK.deployed();
    const accounts = await web3.eth.getAccounts();

    const model = accounts[2];              // treat an address as "model id"
    const score = 80;                       // demo score
    const revealedScore = 80;               // set 0 to keep private
    const scoreHash = web3.utils.keccak256(web3.utils.encodePacked(score));

    // 10-length inputs: [100, 0, 0, 0, 0, 0, 0, 0, 0, 0]
    const inputs10 = Array(10).fill('0'); inputs10[0] = '100';

    // Use named X/Y fields to match struct ABI
    const zero = '0';
    const proof = {
      A: { X: zero, Y: zero },
      B: { X: [zero, zero], Y: [zero, zero] },
      C: { X: zero, Y: zero }
    };

    console.log("Submitting ZK feedback (always-true verifier)...");
    const tx = await rep.submitFeedbackZK(
      model,
      proof,
      inputs10,
      scoreHash,
      revealedScore,
      { from: accounts[0], gas: 7_000_000 }
    );

    console.log("Tx:", tx.tx);
    console.log("feedbackCount:", (await rep.feedbackCount(model)).toString());
    console.log("reputationSum:", (await rep.reputationSum(model)).toString());
    console.log("average x100:", (await rep.getAverage(model)).toString()); // 8000 == 80.00
    callback();
  } catch (e) {
    console.error(e);
    callback(e);
  }
};
