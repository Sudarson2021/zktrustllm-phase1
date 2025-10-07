const hre = require("hardhat");
const fs  = require("fs");
const { keccak256, toUtf8Bytes } = require("ethers");

async function main() {
  const addr = process.env.ZK_REP_ADDR || process.argv[2];
  if (!addr) throw new Error("Usage: ZK_REP_ADDR=<addr> npx hardhat run scripts/zk_submit_with_evidence.js --network localhost");

  const rm = await hre.ethers.getContractAt("ReputationWithZK", addr);
  const [_, signer1] = await hre.ethers.getSigners();
  const subject = process.env.SUBJECT || signer1.address;

  const rating = BigInt(process.env.RATING ?? 80);
  const weight = BigInt(process.env.WEIGHT ?? 100);
  const BOUND  = 100n;

  // Hash the exact file bytes
  const evidencePath = process.env.EVIDENCE || "evidence.json";
  const bytes = fs.readFileSync(evidencePath);
  const evHash = keccak256(bytes);  // 0x + 32 bytes

  // Turn bytes32 -> uint256 for the circuit public input slot
  const evU256 = BigInt(evHash);

  // Shapes
  const a = [0n, 0n];
  const b = [[0n, 0n], [0n, 0n]];
  const c = [0n, 0n];

  console.log("verifier =", await rm.verifier());
  console.log("subject =", subject);
  console.log("evidence hash:", evHash);

  // Detect (boundIdx, ratingIdx)
  let choice = null;
  for (let boundIdx = 0; boundIdx < 10 && !choice; boundIdx++) {
    for (let ratingIdx = 0; ratingIdx < 10 && !choice; ratingIdx++) {
      const input = Array(10).fill(0n);
      input[boundIdx]  = BOUND;
      input[ratingIdx] = rating;
      input[2]         = evU256; // store the evidence hash for traceability

      try {
        await rm.submitFeedbackZK.staticCall(subject, [a, b, c], input, rating, weight);
        choice = { boundIdx, ratingIdx, input };
      } catch {}
    }
  }
  if (!choice) throw new Error("Could not satisfy contract checks with evidence.");

  console.log("Chosen indices:", choice);
  const tx = await rm.submitFeedbackZK(subject, [a, b, c], choice.input, rating, weight);
  const rcpt = await tx.wait();
  console.log("tx hash:", rcpt.hash);

  // Show aggregates again
  const count = await rm.feedbackCount(subject);
  const sum   = await rm.reputationSum(subject);
  const avg   = await rm.getAverage(subject);
  console.log({ count: count.toString(), sum: sum.toString(), avg: avg.toString() });
}

main().catch(e => { console.error(e); process.exit(1); });
