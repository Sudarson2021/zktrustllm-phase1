const hre = require("hardhat");
async function main() {
  const addr = process.env.LLM_ADDR;
  const seconds_ = BigInt(process.env.HALF_LIFE ?? process.argv[2] ?? 0);
  const LLM = await hre.ethers.getContractFactory("LLMReputationV3ZK");
  const llm = LLM.attach(addr);
  const tx = await llm.setHalfLife(seconds_);
  console.log("setHalfLife tx:", tx.hash);
  await tx.wait();
  console.log("halfLifeSec set to:", String(seconds_));
}
main().catch((e)=>{ console.error(e); process.exit(1); });
