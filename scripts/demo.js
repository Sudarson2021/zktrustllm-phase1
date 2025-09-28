const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();

  // Deploy mock verifier (always true)
  const VerifierMock = await hre.ethers.getContractFactory("VerifierMock");
  const verifier = await VerifierMock.deploy(true);
  await verifier.waitForDeployment();
  // Deploy core; make deployer the owner and oracle
  const LLM = await hre.ethers.getContractFactory("LLMReputationV3ZK");
  const llm = await LLM.deploy(deployer.address, deployer.address, await verifier.getAddress());
  await llm.waitForDeployment();

  console.log("VerifierMock:", await verifier.getAddress());
  console.log("LLMReputationV3ZK:", await llm.getAddress());

  // Fake proof data (ignored by VerifierMock)
  const a = [1n, 2n];
  const b = [[3n, 4n], [5n, 6n]];
  const c = [7n, 8n];
  const signals = [111n, 222n, 333n];
  const modelId = 1n;
  const autoScore = 50n;
  const humanScore = 60n;
  const weight = 100n;
  const evidenceURI = "ipfs://demo-evidence";
  const evidenceHash = hre.ethers.keccak256(hre.ethers.toUtf8Bytes(evidenceURI));

  const tx = await llm.submitScoresZK(
    modelId, autoScore, humanScore, weight, evidenceURI, evidenceHash,
    a, b, c, signals
  );
  await tx.wait();

  const saved = await llm.scores(modelId);
  console.log("Saved score:", saved);
}

main().catch((e) => { console.error(e); process.exit(1); });
