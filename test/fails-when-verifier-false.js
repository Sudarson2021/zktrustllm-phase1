const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("LLMReputationV3ZK (negative path)", function () {
  it("reverts when verifier returns false", async () => {
    const [deployer] = await ethers.getSigners();

    // Verifier that always returns false
    const VerifierMock = await ethers.getContractFactory("VerifierMock");
    const verifier = await VerifierMock.deploy(false);
    await verifier.waitForDeployment();

    const LLM = await ethers.getContractFactory("LLMReputationV3ZK");
    const llm = await LLM.deploy(
      deployer.address,            // owner
      deployer.address,            // oracle
      await verifier.getAddress()  // verifier
    );
    await llm.waitForDeployment();

    // Fake proof data
    const a = [1n, 2n];
    const b = [[3n, 4n], [5n, 6n]];
    const c = [7n, 8n];
    const publicSignals = [111n, 222n, 333n];

    const modelId = 1n, autoScore = 50n, humanScore = 60n, weight = 100n;
    const evidenceURI = "ipfs://demo-evidence";
    const evidenceHash = ethers.keccak256(ethers.toUtf8Bytes(evidenceURI));

    await expect(
      llm.submitScoresZK(
        modelId, autoScore, humanScore, weight, evidenceURI, evidenceHash,
        a, b, c, publicSignals
      )
    ).to.be.revertedWith("ZK verify failed");
  });
});
