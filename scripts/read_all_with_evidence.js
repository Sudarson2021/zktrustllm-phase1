const hre = require("hardhat"); const fs = require("fs");
async function main() {
  const addr = process.env.CONTRACT || process.argv[2];
  const json = process.env.JSON || process.argv[3] || "outputs_human/aggregated_scores.json";
  if (!addr) throw new Error("Usage: CONTRACT=<addr> npx hardhat run scripts/read_all_with_evidence.js --network localhost");
  const payload = JSON.parse(fs.readFileSync(json, "utf-8"));
  const c = await hre.ethers.getContractAt("LLMReputation", addr);
  for (const m of payload.models) {
    const s = await c.rawScores(m.modelId);
    const rep = await c.reputation(m.modelId);
    console.log(`${m.name} [${m.modelId}]: rep=${rep.toString()} | auto=${s.autoScore} human=${s.humanScore} w=${s.weight} evidence=${s.evidenceURI}`);
  }
}
main().catch(e => { console.error(e); process.exit(1); });
