const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("LLMReputationV3ZK getters", function () {
  it("getScore and hasScore reflect stored value", async () => {
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

    const modelId = 1n, auto = 50n, human = 60n, weight = 100n;
    const uri = "ipfs://demo-evidence";
    const hash = ethers.keccak256(ethers.toUtf8Bytes(uri));

    await (await llm.submitScoresZK(
      modelId, auto, human, weight, uri, hash, a, b, c, publicSignals
    )).wait();

    const exists = await llm.hasScore(modelId);
    expect(exists).to.equal(true);

    const [exists2, ga, gh, gw, guri, ghash] = await llm.getScore(modelId);
    expect(exists2).to.equal(true);
    expect(ga).to.equal(auto);
    expect(gh).to.equal(human);
    expect(gw).to.equal(weight);
    expect(guri).to.equal(uri);
    expect(ghash).to.equal(hash);
  });
});
