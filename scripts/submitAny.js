const ReputationWithZK = artifacts.require("ReputationWithZK");

// read only the args after the `--` separator
function userArgs() {
  const sep = process.argv.indexOf('--');
  return sep >= 0 ? process.argv.slice(sep + 1) : [];
}

module.exports = async function (cb) {
  try {
    const rep = await ReputationWithZK.deployed();
    const accts = await web3.eth.getAccounts();

    const args = userArgs();
    const score = args[0] !== undefined ? Number(args[0]) : 75;
    if (!Number.isFinite(score)) throw new Error(`Score must be a number. Got "${args[0]}"`);

    const reveal = args[1] === '1';           // "1" => reveal, anything else => private
    const modelIdx = args[2] !== undefined ? Number(args[2]) : 2;
    const fromIdx  = args[3] !== undefined ? Number(args[3]) : 0;

    if (!Number.isInteger(modelIdx) || modelIdx < 0 || modelIdx >= accts.length)
      throw new Error(`Model index out of range. Got "${args[2]}"`);
    if (!Number.isInteger(fromIdx) || fromIdx < 0 || fromIdx >= accts.length)
      throw new Error(`From index out of range. Got "${args[3]}"`);

    const model = accts[modelIdx];
    const from  = accts[fromIdx];

    const inputs10 = Array(10).fill('0'); inputs10[0] = '100';
    const z = '0';
    // Match IVerifier.Proof struct shape (names X/Y)
    const proof = { A:{X:z,Y:z}, B:{X:[z,z],Y:[z,z]}, C:{X:z,Y:z} };
    const scoreHash = web3.utils.keccak256(web3.utils.encodePacked(score));
    const revealedScore = reveal ? score : 0;

    console.log(`Submitting: score=${score}, reveal=${reveal}, model=${model}, from=${from}`);
    const tx = await rep.submitFeedbackZK(model, proof, inputs10, scoreHash, revealedScore, { from, gas: 7_000_000 });
    console.log("Tx:", tx.tx);
    console.log("feedbackCount:", (await rep.feedbackCount(model)).toString());
    console.log("reputationSum:", (await rep.reputationSum(model)).toString());
    console.log("average x100:", (await rep.getAverage(model)).toString());
    cb();
  } catch (e) {
    console.error(e);
    cb(e);
  }
};
