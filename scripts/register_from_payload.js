const hre = require("hardhat");
const fs = require("fs");
async function main() {
  const addr = process.env.CONTRACT || process.argv[2];
  const json = process.env.JSON || process.argv[3] || "outputs/aggregated_scores.json";
  if (!addr) throw new Error("Usage: CONTRACT=<addr> npx hardhat run scripts/register_from_payload.js --network localhost");
  const payload = JSON.parse(fs.readFileSync(json, "utf-8"));
  const c = await hre.ethers.getContractAt("LLMReputation", addr);
  const [admin] = await hre.ethers.getSigners();
  for (const m of payload.models) {
    const info = await c.models(m.modelId);
    if (!info.exists) {
      await (await c.connect(admin).registerModel(m.modelId, m.name, admin.address)).wait();
      console.log("Registered:", m.modelId, m.name);
    } else {
      console.log("Exists    :", m.modelId, info.name);
    }
  }
}
main().catch(e => { console.error(e); process.exit(1); });
