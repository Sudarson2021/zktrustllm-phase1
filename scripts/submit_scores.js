// scripts/submit_scores.js
// Usage: node scripts/submit_scores.js <contractAddress> outputs/aggregated_scores.json --network localhost (via hardhat)
// Run with: npx hardhat run --no-compile scripts/submit_scores.js --network localhost -- <address> outputs/aggregated_scores.json
const hre = require("hardhat");
const fs = require("fs");

async function main() {
  const args = process.argv.slice(2);
  const address = args[0];
  const jsonPath = args[1] || "outputs/aggregated_scores.json";
  if (!address) throw new Error("Missing contract address");
  const raw = fs.readFileSync(jsonPath, "utf-8");
  const payload = JSON.parse(raw);

  const c = await hre.ethers.getContractAt("LLMReputation", address);
  const [deployer, oracle] = await hre.ethers.getSigners();
  console.log("Using oracle:", oracle.address);

  for (const row of payload.models) {
    const { modelId, autoScore, humanScore, weight, evidenceURI } = row;
    console.log(`Submitting -> model ${modelId}: auto=${autoScore}, human=${humanScore}, w=${weight}`);
    const tx = await c.connect(oracle).submitScores(modelId, autoScore, humanScore, weight, evidenceURI || "");
    await tx.wait();
  }
  console.log("Done.");
}
main().catch((e) => { console.error(e); process.exit(1); });
