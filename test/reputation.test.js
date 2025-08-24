const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("ReputationManager (with MockVerifier)", function () {
  it("updates and computes weighted reputation", async function () {
    const [admin] = await ethers.getSigners();

    const MockVerifier = await ethers.getContractFactory("MockVerifier");
    const mock = await MockVerifier.deploy();
    await mock.waitForDeployment();

    const Rep = await ethers.getContractFactory("ReputationManager");
    const rep = await Rep.deploy(await mock.getAddress(), admin.address);
    await rep.waitForDeployment();

    const modelId = ethers.keccak256(ethers.toUtf8Bytes("vicuna-13b"));

    await (await rep.postAutoScore(modelId, 6000)).wait();  // 60%
    await (await rep.setWeights(2500, 7500)).wait();        // 25% human, 75% auto

    // Submit human rating 5 with dummy proof (mock returns true)
    await (await rep.submitHumanFeedbackZK(
      modelId,
      5,
      "0x" + "00".repeat(32),
      [0, 0],
      [[0, 0], [0, 0]],
      [0, 0],
      []
    )).wait();

    const [Rbp, humanBP, autoBP] = await rep.getReputationBP(modelId);
    expect(Number(humanBP)).to.equal(10000); // rating=5 -> 100%
    expect(Number(autoBP)).to.equal(6000);   // 60%
    expect(Number(Rbp)).to.equal(7000);      // 25%*100% + 75%*60% = 70%
  });
});
