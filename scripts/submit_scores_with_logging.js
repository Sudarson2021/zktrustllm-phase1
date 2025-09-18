const hre = require("hardhat");
const fs = require("fs"), path = require("path");
async function main() {
  const address = process.env.CONTRACT || process.argv[2];
  const jsonPath = process.env.JSON || process.argv[3] || "outputs/aggregated_scores.json";
  if (!address) throw new Error("Missing contract address");
  const payload = JSON.parse(fs.readFileSync(jsonPath, "utf-8"));

  const c = await hre.ethers.getContractAt("LLMReputation", address);
  const [ , oracle] = await hre.ethers.getSigners();
  console.log("Using oracle:", oracle.address);

  const outDir = "outputs", outCsv = path.join(outDir, "onchain_submissions.csv");
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
  if (!fs.existsSync(outCsv)) fs.writeFileSync(outCsv, "modelId,txHash,gasUsed,blockNumber,blockTimestamp,autoScore,humanScore,weight,contract,oracle\n");

  for (const row of payload.models) {
    const { modelId, autoScore, humanScore, weight, evidenceURI } = row;
    const tx = await c.connect(oracle).submitScores(modelId, autoScore, humanScore, weight, evidenceURI || "");
    const receipt = await tx.wait();
    const blk = await hre.ethers.provider.getBlock(receipt.blockNumber);
    fs.appendFileSync(outCsv, [
      modelId, tx.hash, receipt.gasUsed.toString(), receipt.blockNumber,
      blk?.timestamp ?? "", autoScore, humanScore, weight, address, oracle.address
    ].join(",") + "\n");
    console.log(`Logged model ${modelId}: gas=${receipt.gasUsed.toString()} block=${receipt.blockNumber}`);
  }
}
main().catch(e => { console.error(e); process.exit(1); });
