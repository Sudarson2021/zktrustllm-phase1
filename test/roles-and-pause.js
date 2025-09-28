const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("LLMReputationV3ZK roles & pause", function () {
  it("blocks submit when paused and non-oracle callers", async () => {
    const [owner, stranger] = await ethers.getSigners();

    const VerifierMock = await ethers.getContractFactory("VerifierMock");
    const verifier = await VerifierMock.deploy(true); await verifier.waitForDeployment();

    const LLM = await ethers.getContractFactory("LLMReputationV3ZK");
    const llm = await LLM.deploy(owner.address, owner.address, await verifier.getAddress());
    await llm.waitForDeployment();

    const a=[1n,2n], b=[[3n,4n],[5n,6n]], c=[7n,8n], signals=[111n,222n,333n];
    const m=1n, auto=1n, human=1n, weight=1n, uri="ipfs://x";
    const hash=ethers.keccak256(ethers.toUtf8Bytes(uri));

    // non-oracle should revert
    await expect(
      llm.connect(stranger).submitScoresZK(m,auto,human,weight,uri,hash,a,b,c,signals)
    ).to.be.revertedWith("not oracle");

    // pause blocks owner/oracle too
    await (await llm.pause()).wait();
    await expect(
      llm.submitScoresZK(m,auto,human,weight,uri,hash,a,b,c,signals)
    ).to.be.revertedWith("paused");
  });
});
