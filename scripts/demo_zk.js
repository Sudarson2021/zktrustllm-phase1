const hre = require("hardhat");
const { readFileSync } = require("fs");
const { keccak256, toUtf8Bytes } = require("ethers");

// Read ZoKrates Groth16 proof and normalize into exact shapes/types
function readProof(path = "zokrates/proof.json") {
  const obj = JSON.parse(readFileSync(path, "utf8"));
  const p = obj.proof;

  const a = [p.a[0].toString(), p.a[1].toString()];
  const b = [
    [p.b[0][0].toString(), p.b[0][1].toString()],
    [p.b[1][0].toString(), p.b[1][1].toString()],
  ];
  const c = [p.c[0].toString(), p.c[1].toString()];
  const inputs = (obj.inputs || obj.input || []).map(x => x.toString());
  if (inputs.length !== 10) throw new Error(`ZoKrates public inputs length is ${inputs.length}, expected 10.`);
  return { a, b, c, inputs };
}

async function main() {
  const repAddr = process.env.REP_ADDR;
  if (!repAddr || !repAddr.startsWith("0x") || repAddr.length !== 42) {
    throw new Error("Set REP_ADDR=0x... (your deployed ReputationManager address)");
  }
  const rep = await hre.ethers.getContractAt("ReputationManager", repAddr);
  const modelId = keccak256(toUtf8Bytes("vicuna-13b"));

  // 1) Oracle posts auto-score (78%)
  await (await rep.postAutoScore(modelId, 7800)).wait();

  // 2) Submit the zk proof (witness used rating=5 above)
  const { a, b, c, inputs } = readProof("zokrates/proof.json");
  const commitment = "0x" + "00".repeat(32); // placeholder commitment
  await (await rep.submitHumanFeedbackZK(modelId, 5, commitment, a, b, c, inputs)).wait();

  // 3) Read blended reputation
  const res = await rep.getReputationBP(modelId);
  console.log({ Rbp: Number(res[0]), humanBP: Number(res[1]), autoBP: Number(res[2]) });
}
main().catch((e)=>{ console.error(e); process.exit(1); });
