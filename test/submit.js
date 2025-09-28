const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("LLMReputationV3ZK", function () {
  it("stores a score after mock verify", async () => {
    const [deployer] = await ethers.getSigners();

    const VerifierMock = await ethers.getContractFactory("VerifierMock");
    const verifier = await VerifierMock.deploy(true);
    await verifier.waitForDeployment();

    const LLM = await ethers.getContractFactory("LLMReputationV3ZK");
    const llm = await LLM.deploy(
      deployer.address,
      deployer.address,
      await verifier.getAddress()
    );
    await llm.waitForDeployment();
    const a = [1n, 2n];
    const b = [[3n, 4n], [5n, 6n]];
    const c = [7n, 8n];
    const publicSignals = [111n, 222n, 333n];

    const modelId = 1n, autoScore = 50n, humanScore = 60n, weight = 100n;
    const evidenceURI = "ipfs://demo-evidence";
    const evidenceHash = ethers.keccak256(ethers.toUtf8Bytes(evidenceURI));

    const tx = await llm.submitScoresZK(
      modelId, autoScore, humanScore, weight, evidenceURI, evidenceHash,
      a, b, c, publicSignals
    );
    await tx.wait();
    const s = await llm.scores(modelId);
    expect(s.autoScore).to.equal(autoScore);
    expect(s.humanScore).to.equal(humanScore);
    expect(s.weight).to.equal(weight);
    expect(s.evidenceURI).to.equal(evidenceURI);
    expect(s.evidenceHash).to.equal(evidenceHash);
  });
});
