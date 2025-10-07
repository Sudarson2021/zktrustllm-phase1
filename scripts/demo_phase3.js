const hre = require("hardhat");

async function main() {
  // 1) Which contract?
  const addr = process.env.ZK_REP_ADDR || process.env.REP_ADDR || process.argv[2];
  if (!addr) throw new Error("Set ZK_REP_ADDR (or REP_ADDR) in .env, or pass address as an argument.");
  const rm = await hre.ethers.getContractAt("ReputationWithZK", addr);
  console.log("Attached to ReputationWithZK at", addr);

  // 2) Subject to score (defaults to signer1)
  const [signer0, signer1] = await hre.ethers.getSigners();
  const subject = process.env.SUBJECT || signer1.address;
  console.log("Subject =", subject);

  // 3) Mock Groth16 proof (ZoKrates shape)
  const a = [0n, 0n];
  const b = [[0n, 0n], [0n, 0n]];
  const c = [0n, 0n];
  const input = Array(10).fill(0n);

  // 4) rating/weight — IMPORTANT: contract expects weight == 100
  const rating = BigInt(process.env.RATING ?? 80);   // 0..100
  const weight = BigInt(process.env.BOUND  ?? 100);  // MUST be 100 in this contract
  console.log("rating =", rating.toString(), "weight =", weight.toString());

  // (Optional) sanity: show the verifier address
  if (rm.verifier) {
    console.log("verifier =", await rm.verifier());
  }

  // 5) Dry-run to catch reverts before sending a tx
  try {
    await rm.callStatic.submitFeedbackZK(subject, [a, b, c], input, rating, weight);
    console.log("callStatic ok (no revert).");
  } catch (e) {
    console.error("callStatic revert:", e.reason || e.shortMessage || e.message);
    throw e; // Stop here if it would revert on-chain
  }

  // 6) Send the real tx
  console.log("Submitting ZK feedback...");
  const tx = await rm.submitFeedbackZK(subject, [a, b, c], input, rating, weight);
  const rcpt = await tx.wait();
  console.log("Submitted. tx =", rcpt.hash);

  // 7) Read back state
  const count = await rm.feedbackCount(subject);
  const sum   = await rm.reputationSum(subject);
  const avg   = await rm.getAverage(subject);
  console.log("count =", count.toString());
  console.log("sum   =", sum.toString());
  console.log("avg   =", avg.toString());

  // 8) Show the last FeedbackSubmitted event (if any)
  const evs = await rm.queryFilter("FeedbackSubmitted", 0, "latest");
  console.log("FeedbackSubmitted events:", evs.length);
  if (evs.length) {
    const last = evs.at(-1);
    console.log("Last event args:", last.args.map(String));
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
