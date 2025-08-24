const hre = require("hardhat");
const { readFileSync } = require("fs");

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
  return { a, b, c, inputs };
}

async function main() {
  const verifierAddr = process.env.VERIFIER_ADDR;
  if (!verifierAddr || !verifierAddr.startsWith("0x") || verifierAddr.length !== 42) {
    throw new Error("Set VERIFIER_ADDR=0x... (your deployed ZoKrates Verifier)");
  }
  const { a, b, c, inputs } = readProof();
  const verifier = await hre.ethers.getContractAt("Verifier", verifierAddr);
  const ok = await verifier.verifyTx(a, b, c, inputs);
  console.log("Verifier.verifyTx(proof) =>", ok);
}

main().catch((e) => { console.error(e); process.exit(1); });
