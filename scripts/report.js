const hre = require("hardhat");

async function main() {
  const { ethers } = hre;

  // Ensure env addrs are present
  const repAddr = process.env.REP_ADDR;
  const zkAddr  = process.env.ZK_REP_ADDR;
  if (!repAddr || !zkAddr) {
    throw new Error("Set REP_ADDR and ZK_REP_ADDR in your environment or .env.");
  }

  // Phase 1–2 contract (basis-points model id)
  const rm1 = await ethers.getContractAt("ReputationManager", repAddr);
  const id  = ethers.encodeBytes32String("1");
  const p1  = await rm1.getReputationBP(id);
  console.log("ReputationManager.getReputationBP('1'):", p1);

  // Phase 3–4 contract (per-address feedback with ZK)
  const rz = await ethers.getContractAt("ReputationWithZK", zkAddr);
  const [_, s1] = await ethers.getSigners();
  const subject = s1.address;
  console.log("subject:", subject);
  console.log("count:", (await rz.feedbackCount(subject)).toString());
  console.log("sum:",   (await rz.reputationSum(subject)).toString());
  console.log("avg:",   (await rz.getAverage(subject)).toString());

  const evs = await rz.queryFilter("FeedbackSubmitted", 0, "latest");
  console.log("FeedbackSubmitted events:", evs.length);
  if (evs.length) console.log("Last event:", evs.at(-1).args);
}

main().catch(e => { console.error(e); process.exit(1); });
