import express from "express";
import Web3 from "web3";
import fs from "fs";
import path from "path";
import url from "url";

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
const RPC_URL = process.env.WEB3_URL || "http://127.0.0.1:8545";
const FN_ZK  = process.env.FN_ZK  || "submitFeedbackZK";
const BOUND  = process.env.BOUND  || "100";   // contract requires input[0] == 100
const PORT   = process.env.PORT   || 4000;

const app = express();
app.use(express.json());
const web3 = new Web3(RPC_URL);

// --- helpers ---
const abiFn = (abi, name) => abi.find(f => f.type === "function" && f.name === name);

function artifact() {
  const artPath = path.join(__dirname, "../build/contracts/ReputationWithZK.json");
  if (!fs.existsSync(artPath)) throw new Error("Missing build/contracts/ReputationWithZK.json (run truffle migrate)");
  return JSON.parse(fs.readFileSync(artPath, "utf8"));
}

async function loadContract() {
  const art = artifact();
  const netId = await web3.eth.net.getId();
  const networks = art.networks || {};
  const entry = networks[netId];
  if (!entry || !entry.address) {
    throw new Error(`No deployed address for netId ${netId} in artifact.networks. Run: npx truffle migrate --reset --network development`);
  }
  const code = await web3.eth.getCode(entry.address);
  if (!code || code === "0x") throw new Error(`No code at ${entry.address} on netId ${netId}`);
  const fn = abiFn(art.abi, FN_ZK);
  if (!fn) throw new Error(`Function ${FN_ZK} not in ABI`);
  const contract = new web3.eth.Contract(art.abi, entry.address);
  return { netId, contract, address: entry.address, fn };
}

// --- endpoints ---
app.get("/health", async (_req, res) => {
  try {
    const art = artifact();
    const { netId, contract, address, fn } = await loadContract();
    const code = await web3.eth.getCode(address);
    res.json({
      ok: true,
      netId,
      contract: address,
      fn: fn.name + "(" + fn.inputs.map(i => i.type).join(",") + ")",
      inputs: fn.inputs.map(i => ({ name: i.name, type: i.type, comps: i.components ? i.components.map(c => c.type + " " + c.name) : null })),
      bound: String(BOUND),
      hasCode: code && code !== "0x"
    });
  } catch (e) {
    res.json({ ok: false, error: String(e) });
  }
});

app.post("/submit", async (req, res) => {
  try {
    const { score = 92, reveal = true, modelIdx = 2, fromIdx = 0, model: modelOverride, from: fromOverride } = req.body || {};
    const { contract, address, fn } = await loadContract();
    const accounts = await web3.eth.getAccounts();
    const model = modelOverride || accounts[modelIdx];
    const from  = fromOverride  || accounts[fromIdx];

    // zero proof (AlwaysTrueVerifier will accept)
    const zero = "0";
    const proof = {
      A: { X: zero, Y: zero },
      B: { X: [zero, zero], Y: [zero, zero] },
      C: { X: zero, Y: zero }
    };

    // public input (10 slots) -> input[0]=BOUND, input[1]=score, rest zero
    const input = Array(10).fill("0");
    input[0] = String(BOUND);
    input[1] = String(score);

    // scoreHash = keccak256(uint256(score)) as decimal string
    const scoreHashHex = web3.utils.soliditySha3({ t: "uint256", v: String(score) });
    const scoreHash = web3.utils.toBN(scoreHashHex).toString();

    const revealedScore = reveal ? String(score) : "0";

    const payload = { input, scoreHash, revealedScore, model, from };
    console.log("DEBUG payload →", payload);

    // Build tx
    const tx = contract.methods[fn.name](model, proof, input, scoreHash, revealedScore);

    // Estimate gas + margin
    const gas = await tx.estimateGas({ from });
    const gasLimit = Math.floor(gas * 1.5);

    const receipt = await tx.send({ from, gas: gasLimit });
    res.json({ ok: true, tx: receipt.transactionHash, gasUsed: receipt.gasUsed });
  } catch (e) {
    console.error(e);
    res.json({ ok: false, error: String(e) });
  }
});

// --- startup ---
loadContract()
  .then(({ address, fn }) => {
    console.log(`Bridge → contract: ${address}`);
    console.log(`Using ${fn.name}(${fn.inputs.map(i=>i.type).join(",")})`);
    app.listen(PORT, () => console.log(`Bridge listening on :${PORT} → ${address}`));
  })
  .catch(e => { console.error(e); process.exit(1); });
