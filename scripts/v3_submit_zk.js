const fs = require("fs");
const crypto = require("crypto");
const V3ZK = artifacts.require("LLMReputationV3ZK");
const Groth16Verifier = artifacts.require("Groth16Verifier");

// normalize snarkjs proof shapes
function normProof(obj) {
  if (obj.proof && obj.proof.a && obj.proof.b && obj.proof.c) return obj.proof;
  if (obj.pi_a && obj.pi_b && obj.pi_c) return { a: obj.pi_a, b: obj.pi_b, c: obj.pi_c };
  if (obj.a && obj.b && obj.c) return { a: obj.a, b: obj.b, c: obj.c };
  throw new Error("Unrecognized proof JSON shape");
}

// build the two common pairings for B (no-swap vs swap inner Fp2 coords)
function buildBVariants(b) {
  // as-is
  const B1 = [[b[0][0], b[0][1]], [b[1][0], b[1][1]]];
  // swapped columns (common for Solidity verifiers)
  const B2 = [[b[0][1], b[0][0]], [b[1][1], b[1][0]]];
  return [B1, B2];
}

// try both public-signal orders seen in this project
function buildPubVariants(pub) {
  // pub from snarkjs for your circuit is usually ["1","25","<score>"] => [ok, n, auto]
  const asIs = [pub[0], pub[1], pub[2]];
  const alt  = [pub[1], pub[2], pub[0]]; // [n, auto, ok]
  return [asIs, alt];
}

module.exports = async function (cb) {
  try {
    const addr = process.env.CONTRACT;
    if (!addr) throw new Error("Set CONTRACT=<LLMReputationV3ZK address>");

    const i = process.argv.indexOf("--");
    if (i < 0) throw new Error("Usage: truffle exec scripts/v3_submit_zk.js -- proof.json public.json evidence.bin [evidenceURI]");
    const [proofPath, pubPath, evPath, evidenceURI = "ipfs://demo-cid"] = process.argv.slice(i + 1);

    const proofRaw = JSON.parse(fs.readFileSync(proofPath, "utf8"));
    const pub      = JSON.parse(fs.readFileSync(pubPath,   "utf8"));
    if (!Array.isArray(pub) || pub.length !== 3) {
      throw new Error(`public.json must be an array of 3 items; got ${JSON.stringify(pub)}`);
    }

    const p = normProof(proofRaw);
    const A = [p.a[0], p.a[1]];
    const [BnoSwap, Bswap] = buildBVariants(p.b);
    const C = [p.c[0], p.c[1]];
    const [PUB_asIs, PUB_alt] = buildPubVariants(pub);

    const Z = await V3ZK.at(addr);
    const verifierAddr = await Z.verifier();
    const V = await Groth16Verifier.at(verifierAddr);

    // probe locally (view) to discover a working combo
    const candidates = [
      { B: BnoSwap, PUB: PUB_asIs, name: "B=noSwap, PUB=asIs" },
      { B: BnoSwap, PUB: PUB_alt,  name: "B=noSwap, PUB=alt"  },
      { B: Bswap,   PUB: PUB_asIs, name: "B=swap,   PUB=asIs" },
      { B: Bswap,   PUB: PUB_alt,  name: "B=swap,   PUB=alt"  },
    ];

    let chosen = null;
    for (const c of candidates) {
      const ok = await V.verifyProof.call(A, c.B, C, c.PUB);
      if (ok) { chosen = c; break; }
    }
    if (!chosen) throw new Error("Local verification against on-chain verifier failed for all variants");

    // derive autoScore from whichever PUB we picked
    // If PUB=asIs (expected: [ok,n,auto]) => auto at index 2
    // If PUB=alt  (expected: [n,auto,ok]) => auto at index 1
    const auto = Number(chosen.PUB[2] || chosen.PUB[1]);
    const modelId = 1, human = 90, weight = 99;

    const evHash = "0x" + crypto.createHash("sha256").update(fs.readFileSync(evPath)).digest("hex");
    const [, oracle] = await web3.eth.getAccounts();

    const tx = await Z.submitScoresZK(
      modelId, auto, human, weight, evidenceURI, evHash,
      A, chosen.B, C, chosen.PUB,
      { from: oracle }
    );

    console.log("Tx:", tx.tx);
    console.log("Variant:", chosen.name);
    console.log("autoScore:", auto);
    console.log("Evidence SHA-256:", evHash);
    console.log("URI:", evidenceURI);
    cb();
  } catch (e) { cb(e); }
}
