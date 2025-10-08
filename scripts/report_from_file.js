const fs = require("fs");
const path = require("path");

async function main() {
  const addrs = JSON.parse(fs.readFileSync(path.join(__dirname, ".addr.localhost.json")));
  const abi = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "abi", "reputationWithZK.exact.json")));
  const [ , account1 ] = await ethers.getSigners();

  const rm = await ethers.getContractAt("ReputationManager", addrs.ReputationManager);
  const zk = new ethers.Contract(addrs.ReputationWithZK, abi, account1);

  const subject = process.env.MODEL_ADDR || account1.address;

  try {
    const keyOne = "0x" + "01".padStart(64, "0");
    console.log("RM.getReputationBP(1):", await rm.getReputationBP(keyOne));
  } catch {
    console.log("RM.getReputationBP(1): (no data yet)");
  }

  console.log("feedbackCount:", (await zk.feedbackCount(subject)).toString());
  console.log("reputationSum:", (await zk.reputationSum(subject)).toString());
  console.log("average:", (await zk.getAverage(subject)).toString());
}

main().catch((e)=>{ console.error(e); process.exit(1); });
