const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

async function main() {
  const addrs = JSON.parse(fs.readFileSync(path.join(__dirname, ".addr.localhost.json")));
  const abi = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "abi", "reputationWithZK.exact.json")));
  const [deployer, account1] = await ethers.getSigners();
  const zk = new ethers.Contract(addrs.ReputationWithZK, abi, deployer);

  const model = process.env.MODEL_ADDR || account1.address;
  const rating = BigInt(process.env.RATING || "80");

  // evidence text (inline or file)
  let evidenceText = process.env.EVIDENCE_TEXT || "";
  const evidenceFile = process.env.EVIDENCE_FILE;
  if (!evidenceText && evidenceFile) evidenceText = fs.readFileSync(evidenceFile, "utf8");

  const evHex = "0x" + crypto.createHash("sha256").update(evidenceText).digest("hex");
  const evU256 = ethers.toBigInt(evHex);

  // packed hash(address model, uint rating, uint evidenceHash)
  const coder = ethers.AbiCoder.defaultAbiCoder();
  const enc = coder.encode(["address","uint256","uint256"], [ethers.getAddress(model), rating, evU256]);
  const scoreHash = ethers.toBigInt(ethers.keccak256(enc));

  // zero-ish proof for MockVerifier
  const proof = {
    A:{X:0n,Y:0n},
    B:{X:[0n,0n],Y:[0n,0n]},
    C:{X:0n,Y:0n}
  };
  const input = [100n, rating, evU256, 0n,0n,0n,0n,0n,0n,0n];

  const tx = await zk.submitFeedbackZK(model, proof, input, scoreHash, rating);
  const rc = await tx.wait();
  console.log("submitted tx:", rc.hash);
}
main().catch(e => { console.error(e); process.exit(1); });
