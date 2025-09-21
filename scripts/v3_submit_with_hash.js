const fs = require("fs");
const crypto = require("crypto");
const V3 = artifacts.require("LLMReputationV3");

module.exports = async function (cb){
  try{
    const addr = process.env.CONTRACT;
    if(!addr) throw new Error("Set CONTRACT=<address>");
    const argi = process.argv.indexOf("--");
    if(argi < 0) throw new Error("Usage: truffle exec scripts/v3_submit_with_hash.js -- evidence.bin");
    const file = process.argv[argi+1];

    const buf = fs.readFileSync(file);
    const evidenceHash = "0x" + crypto.createHash("sha256").update(buf).digest("hex");

    const v3 = await V3.at(addr);
    const [, oracle] = await web3.eth.getAccounts();

    const modelId = 1, auto = 92, human = 90, weight = 99;
    const uri = "ipfs://<your-cid>";

    const tx = await v3.submitScoresWithEvidence(
      modelId, auto, human, weight, uri, evidenceHash, { from: oracle }
    );

    console.log("Tx:", tx.tx);
    console.log("Evidence SHA-256:", evidenceHash);
    cb();
  } catch (e) {
    cb(e);
  }
}
