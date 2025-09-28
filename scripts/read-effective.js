const hre = require("hardhat");
async function main() {
  const addr = process.env.LLM_ADDR;
  const modelId = BigInt(process.env.MODEL_ID || "1");
  const LLM = await hre.ethers.getContractFactory("LLMReputationV3ZK");
  const llm = LLM.attach(addr);
  const [exists, as, hs, wt, uri, hash, ts] = await llm.getEffectiveScore(modelId);
  console.log({ exists, autoScoreEff: Number(as), humanScoreEff: Number(hs), weightEff: Number(wt), evidenceURI: uri, evidenceHash: hash, lastUpdated: Number(ts) });
}
main().catch((e)=>{ console.error(e); process.exit(1); });
