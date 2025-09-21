const hre = require("hardhat");

async function main() {
  const addr = process.env.REP_ADDR;
  if (!addr) throw new Error("Set REP_ADDR=0x... (ReputationManager address from Terminal 1 logs)");

  const rep = await hre.ethers.getContractAt("ReputationManager", addr);

  // Post three auto scores (modelId, autoScore, weight)
  await (await rep.postAutoScore(1, 85, 5)).wait();
  await (await rep.postAutoScore(2, 62, 5)).wait();
  await (await rep.postAutoScore(3, 43, 5)).wait();

  // Read reputations back
  for (const id of [1,2,3]) {
    const r = await rep.reputation(id);
    console.log(`model ${id} reputation = ${r.toString()}`);
  }
}
main().catch((e) => { console.error(e); process.exit(1); });
