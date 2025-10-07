const hre = require("hardhat");

async function main() {
  const addr = process.env.ZK_REP_ADDR || process.argv[2];
  if (!addr) {
    throw new Error("Usage: ZK_REP_ADDR=<addr> npx hardhat run scripts/zk_submit_autodetect.js --network localhost");
  }
  const rm = await hre.ethers.getContractAt("ReputationWithZK", addr);

  // subject = signer1 by default
  const [_, signer1] = await hre.ethers.getSigners();
  const subject = process.env.SUBJECT || signer1.address;

  const rating = BigInt(process.env.RATING ?? 80); // 0..100
  const weight = BigInt(process.env.WEIGHT ?? 100); // keep 100 unless your contract says otherwise
  const BOUND  = 100n;

  // Groth16 shapes (MockVerifier accepts anything)
  const a = [0n, 0n];
  const b = [[0n, 0n], [0n, 0n]];
  const c = [0n, 0n];

  console.log("Using:", { addr, subject, rating: rating.toString(), weight: weight.toString() });
  console.log("verifier =", await rm.verifier());

  // Try all index pairs for (boundIdx, ratingIdx)
  let chosen = null;
  for (let boundIdx = 0; boundIdx < 10 && !chosen; boundIdx++) {
    for (let ratingIdx = 0; ratingIdx < 10 && !chosen; ratingIdx++) {
      const input = Array(10).fill(0n);
      input[boundIdx] = BOUND;
      input[ratingIdx] = rating;

      try {
        await rm.submitFeedbackZK.staticCall(subject, [a, b, c], input, rating, weight);
        chosen = { boundIdx, ratingIdx, input };
      } catch (_) {
        // keep trying
      }
    }
  }

  if (!chosen) {
    throw new Error("Could not find input indices that satisfy the contract checks (bound & rating).");
  }

  console.log("Auto-detected indices:", chosen);

  // Send real tx
  const tx = await rm.submitFeedbackZK(subject, [a, b, c], chosen.input, rating, weight);
  const rcpt = await tx.wait();
  console.log("tx hash:", rcpt.hash);

  // Aggregates
  const count = await rm.feedbackCount(subject);
  const sum   = await rm.reputationSum(subject);
  const avg   = await rm.getAverage(subject);
  console.log({ count: count.toString(), sum: sum.toString(), avg: avg.toString() });

  // Last event
  const evs = await rm.queryFilter("FeedbackSubmitted", 0, "latest");
  console.log("FeedbackSubmitted events:", evs.length);
  if (evs.length) console.log("Last args:", evs.at(-1).args);
}

main().catch(e => { console.error(e); process.exit(1); });
