const hre = require("hardhat"); const fs = require("fs");
async function main() {
  const addr = process.env.CONTRACT || process.argv[2];
  const json = process.env.JSON || process.argv[3] || "outputs_human/aggregated_scores.json";
  if (!addr) throw new Error("Usage: CONTRACT=<addr> npx hardhat run scripts/export_chain_csv.js --network localhost");
  const payload = JSON.parse(fs.readFileSync(json, "utf-8"));
  const c = await hre.ethers.getContractAt("LLMReputation", addr);
  const rows = [["modelId","name","reputation","autoScore","humanScore","weight","evidenceURI"]];
  for (const m of payload.models) {
    const s = await c.rawScores(m.modelId);
    const rep = await c.reputation(m.modelId);
    rows.push([m.modelId, m.name, rep.toString(), s.autoScore, s.humanScore, s.weight, s.evidenceURI]);
  }
  fs.writeFileSync("outputs_human/onchain_snapshot.csv", rows.map(r=>r.join(",")).join("\n"));
  console.log("Wrote outputs_human/onchain_snapshot.csv");
}
main().catch(e => { console.error(e); process.exit(1); });
