const hre = require("hardhat");
const { keccak256, toUtf8Bytes } = require("ethers");

async function main() {
  const repAddr = process.env.REP_ADDR;
  if (!repAddr) throw new Error("Set REP_ADDR=0x... from deploy logs");

  const rep = await hre.ethers.getContractAt("ReputationManager", repAddr);
  const modelId = keccak256(toUtf8Bytes("vicuna-13b"));

  // 1) Oracle posts auto-score (deployer has ORACLE_ROLE)
  await (await rep.postAutoScore(modelId, 7800)).wait(); // 78%

  // 2) Submit a human rating using the mock verifier (dummy proof params)
  const commitment = "0x" + "00".repeat(32);
  await (await rep.submitHumanFeedbackZK(
    modelId,
    5,                    // rating=5
    commitment,
    [0,0],                // a
    [[0,0],[0,0]],        // b
    [0,0],                // c
    []                    // inputs
  )).wait();

  // 3) Query reputation
  const [Rbp, humanBP, autoBP] = await rep.getReputationBP(modelId);
  console.log({ Rbp: Number(Rbp), humanBP: Number(humanBP), autoBP: Number(autoBP) });
}

main().catch((e)=>{ console.error(e); process.exit(1); });
