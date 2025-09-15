const hre = require("hardhat");
async function main() {
  const addr = process.env.CONTRACT || process.argv[2];
  if (!addr) throw new Error("Usage: CONTRACT=<addr> npx hardhat run scripts/decay_demo.js --network localhost");
  const c = await hre.ethers.getContractAt("LLMReputation", addr);
  await (await c.setDecayBpsPerDay(500)).wait(); // 5%/day for a visible effect
  for (let d=0; d<=5; d++) {
    const rep1 = await c.reputation(1);
    console.log(`Day ${d}: rep(model1)=${rep1.toString()}`);
    // advance 1 day
    await hre.network.provider.send("evm_increaseTime", [24*60*60]);
    await hre.network.provider.send("evm_mine");
  }
}
main().catch(e => { console.error(e); process.exit(1); });
