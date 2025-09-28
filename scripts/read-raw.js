const hre = require("hardhat");
async function main() {
  const addr = process.env.LLM_ADDR;
  const modelId = BigInt(process.env.MODEL_ID || "1");
  const LLM = await hre.ethers.getContractFactory("LLMReputationV3ZK");
  const llm = LLM.attach(addr);
  const [exists, as, hs, wt, uri, hash] = await llm.getScore(modelId);
  console.log({ exists, autoScore: Number(as), humanScore: Number(hs), weight: Number(wt), evidenceURI: uri, evidenceHash: hash });
}
main().catch((e)=>{ console.error(e); process.exit(1); });
