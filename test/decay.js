const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Decay", function () {
  it("halves after one half-life", async () => {
    const [owner] = await ethers.getSigners();

    const VerifierMock = await ethers.getContractFactory("contracts/VerifierMock.sol:VerifierMock");
    const verifier = await VerifierMock.deploy(true);
    await verifier.waitForDeployment();

    const LLM = await ethers.getContractFactory("LLMReputationV3ZK");
    const llm = await LLM.deploy(owner.address, owner.address, await verifier.getAddress());
    await llm.waitForDeployment();

    // half-life = 1 day
    await (await llm.setHalfLife(24*60*60)).wait();

    const a=[1n,2n], b=[[3n,4n],[5n,6n]], c=[7n,8n], sig=[111n,222n,333n];
    const m=42n, auto=100n, human=100n, weight=100n;
    const uri="ipfs://e", hash=ethers.keccak256(ethers.toUtf8Bytes(uri));

    await (await llm.submitScoresZK(m,auto,human,weight,uri,hash,a,b,c,sig)).wait();

    // advance time by ~one half-life
    await ethers.provider.send("evm_increaseTime", [24*60*60]);
    await ethers.provider.send("evm_mine");

    const [, asEff, hsEff, wtEff] = await llm.getEffectiveScore(m);
    expect(asEff).to.equal(50);
    expect(hsEff).to.equal(50);
    expect(wtEff).to.equal(50);
  });
});
