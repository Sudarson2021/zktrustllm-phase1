const hre = require("hardhat");
const fs = require("fs");

async function main() {
  const llmAddr = process.env.LLM_ADDR;
  if (!llmAddr) throw new Error("Set LLM_ADDR in .env");

  const LLM = await hre.ethers.getContractFactory("LLMReputationV3ZK");
  const llm = LLM.attach(llmAddr);

  const modelId   = BigInt(process.env.MODEL_ID || "1");
  const autoScore = 77n, humanScore = 80n, weight = 100n;

  // Evidence: load JSON file if provided, else fallback
  let evidenceJson;
  if (process.env.EVIDENCE_PATH && fs.existsSync(process.env.EVIDENCE_PATH)) {
    evidenceJson = fs.readFileSync(process.env.EVIDENCE_PATH, "utf8");
  } else {
    evidenceJson = JSON.stringify({ prompt: "demo", answer: "ok", metrics: { bart: 0.88 } });
  }
  const evidenceHash = hre.ethers.keccak256(hre.ethers.toUtf8Bytes(evidenceJson));
  const evidenceURI  = process.env.EVIDENCE_URI || "ipfs://demo";

  // Fake Groth16 proof (VerifierMock ignores content)
  const a = [1n,2n], b = [[3n,4n],[5n,6n]], c = [7n,8n];
  const signals = [111n,222n,333n];

  const tx = await llm.submitScoresZK(
    modelId, autoScore, humanScore, weight, evidenceURI, evidenceHash, a, b, c, signals
  );
  console.log("submit tx:", tx.hash);
  await tx.wait();
  console.log("done");
}

main().catch((e)=>{ console.error(e); process.exit(1); });
