const hre = require("hardhat");

async function main() {
  const addr = process.env.REP_ADDR;
  if (!addr) throw new Error("Set REP_ADDR=0x... (ReputationManager address from Terminal 1 logs)");

  const rep = await hre.ethers.getContractAt("ReputationManager", addr);

  const modelId = 1;
  const humanScore = 60;

  // Groth16-shaped dummy proof
  const a = [0n, 0n];
  const b = [[0n, 0n], [0n, 0n]];
  const c = [0n, 0n];

  // Adjust the length of inputs to your contract’s verifier public inputs (try 2 first)
  const input = [0n, 0n];

  // If your ABI is submitHumanFeedbackZK(modelId, humanScore, a, b, c, input)
  const tx = await rep.submitHumanFeedbackZK(modelId, humanScore, a, b, c, input);
  await tx.wait();

  const r = await rep.reputation(modelId);
  console.log(`model ${modelId} reputation after ZK submit = ${r.toString()}`);
}
main().catch((e) => { console.error(e); process.exit(1); });
