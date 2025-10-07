const hre = require("hardhat");

async function main() {
  const addr = process.env.ZK_REP_ADDR || process.argv[2];
  if (!addr) {
    throw new Error("Usage: ZK_REP_ADDR=<addr> npx hardhat run scripts/zk_submit.js --network localhost");
  }

  const rm = await hre.ethers.getContractAt("ReputationWithZK", addr);

  // default subject: signer1
  const [_, signer1] = await hre.ethers.getSigners();
  const subject = process.env.SUBJECT || signer1.address;

  // Parameters
  const rating = BigInt(process.env.RATING ?? 80); // 0..100
  const bound  = 100n;                             // MUST be 100 (contract requires this)
  const weight = BigInt(process.env.WEIGHT ?? 100); // used by contract; keep == 100 to match bound

  // Groth16 / ZoKrates proof shapes expected by MockVerifier
  const a = [0n, 0n];
  const b = [[0n, 0n], [0n, 0n]];
  const c = [0n, 0n];

  // >>> KEY FIX: encode rating and bound inside the public inputs <<<
  const input = Array(10).fill(0n);
  input[0] = rating; // rating in public inputs
  input[1] = bound;  // bound must be exactly 100

  console.log("Using", {
    addr,
    subject,
    rating: rating.toString(),
    bound: bound.toString(),
    weight: weight.toString()
  });
  console.log("verifier =", await rm.verifier());

  // Dry-run to catch reverts early
  await rm.submitFeedbackZK.staticCall(subject, [a, b, c], input, rating, weight);

  // Send the tx
  const tx = await rm.submitFeedbackZK(subject, [a, b, c], input, rating, weight);
  const rcpt = await tx.wait();
  console.log("tx hash:", rcpt.hash);

  // Read back aggregates
  const count = await rm.feedbackCount(subject);
  const sum   = await rm.reputationSum(subject);
  const avg   = await rm.getAverage(subject);
  console.log({ count: count.toString(), sum: sum.toString(), avg: avg.toString() });

  // Show last event
  const evs = await rm.queryFilter("FeedbackSubmitted", 0, "latest");
  console.log("FeedbackSubmitted events:", evs.length);
  if (evs.length) {
    const last = evs.at(-1);
    console.log("Last event args:", last.args);
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
