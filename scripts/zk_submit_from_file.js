const fs = require("fs");
const path = require("path");

async function main() {
  const addrs = JSON.parse(fs.readFileSync(path.join(__dirname, ".addr.localhost.json")));
  const abi = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "abi", "reputationWithZK.exact.json")));
  const [deployer, account1] = await ethers.getSigners();

  // Contract using exact ABI
  const zk = new ethers.Contract(addrs.ReputationWithZK, abi, deployer);

  // Subject ("model") being rated
  const model = process.env.MODEL_ADDR || account1.address;

  // Public inputs: [bound, rating, evidenceHashUint256, 0..0] length=10
  const bound = 100n;                                  // contract expects exactly 100
  const rating = BigInt(process.env.RATING || "80");   // your score
  const evHex = process.env.EVIDENCE_HASH || ("0x" + "00".repeat(64));
  const evidenceU256 = ethers.toBigInt(evHex);
  const input = [bound, rating, evidenceU256, 0n,0n,0n,0n,0n,0n,0n];

  // Minimal "valid" proof shape for MockVerifier
  const proof = {
    A: { X: 0n, Y: 0n },
    B: { X: [0n, 0n], Y: [0n, 0n] },
    C: { X: 0n, Y: 0n },
  };

  // scoreHash = uint256( keccak256(abi.encode(address,uint256,uint256)) )
  const coder = ethers.AbiCoder.defaultAbiCoder();
  const encoded = coder.encode(["address","uint256","uint256"], [model, bound, rating]);
  const scoreHash = ethers.toBigInt(ethers.keccak256(encoded));

  const tx = await zk.submitFeedbackZK(model, proof, input, scoreHash, rating);
  const rc = await tx.wait();
  console.log("submit tx:", rc.hash);
}

main().catch((e)=>{ console.error(e); process.exit(1); });
