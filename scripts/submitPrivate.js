const ReputationWithZK = artifacts.require("ReputationWithZK");
module.exports = async function (cb) {
  try {
    const rep = await ReputationWithZK.deployed();
    const accounts = await web3.eth.getAccounts();
    const model = accounts[2];
    const score = 95;                               // demo score
    const inputs10 = Array(10).fill('0'); inputs10[0] = '100';
    const z = '0';
    const proof = { A:{X:z,Y:z}, B:{X:[z,z],Y:[z,z]}, C:{X:z,Y:z} };
    const scoreHash = web3.utils.keccak256(web3.utils.encodePacked(score));
    const tx = await rep.submitFeedbackZK(model, proof, inputs10, scoreHash, 0, {from:accounts[0], gas:7_000_000});
    console.log("Tx:", tx.tx);
    console.log("feedbackCount:", (await rep.feedbackCount(model)).toString());
    console.log("reputationSum:", (await rep.reputationSum(model)).toString());
    console.log("average x100:", (await rep.getAverage(model)).toString()); // unchanged (private)
    cb();
  } catch (e){ console.error(e); cb(e); }
};
