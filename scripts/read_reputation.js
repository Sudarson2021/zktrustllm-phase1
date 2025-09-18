const hre = require("hardhat");
async function main() {
  const addr = process.env.CONTRACT || process.argv[2];
  if (!addr) throw new Error("Usage: CONTRACT=<addr> npx hardhat run scripts/read_reputation.js --network localhost");
  const c = await hre.ethers.getContractAt("LLMReputation", addr);
  for (const id of [1,2,3]) {
    const s = await c.rawScores(id);
    const rep = await c.reputation(id);
    console.log(`model ${id}: rep=${rep.toString()} | auto=${s.autoScore} human=${s.humanScore} w=${s.weight} evidence=${s.evidenceURI}`);
  }
}
main().catch(e => { console.error(e); process.exit(1); });
