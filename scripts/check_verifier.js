const hre = require("hardhat");

async function attachVerifier(addr) {
  // Try common artifacts (fully qualified to avoid HH701)
  const candidates = [
    "contracts/Verifier.sol:Verifier",                 // ZoKrates style
    "contracts/MockVerifier.sol:MockVerifier",         // project mock
    "contracts/IVerifier.sol:IVerifier",
    "contracts/ReputationManager.sol:IVerifier",
  ];
  for (const fq of candidates) {
    try {
      const c = await hre.ethers.getContractAt(fq, addr);
      return c;
    } catch (_) {}
  }
  throw new Error("Could not attach to verifier at " + addr + " with known ABIs");
}

async function main() {
  const addr = process.env.VERIFIER_ADDR;
  if (!addr) throw new Error("Set VERIFIER_ADDR=0x... (your deployed verifier address)");

  const v = await attachVerifier(addr);
  console.log("Verifier at:", addr);

  // List functions (useful in logs)
  const funcs = v.interface.fragments
    .filter(f => f.type === "function")
    .map(f => f.format());
  // console.log(funcs.join("\n"));

  // Prepare mock proof shapes
  const a = [0n, 0n];
  const b = [[0n, 0n], [0n, 0n]];
  const c = [0n, 0n];
  const input10 = Array(10).fill(0n);

  // Try calling in this order:
  // 1) ZoKrates-style verifyTx(Proof, uint[10])
  // 2) Generic verifyProof(a,b,c,input)
  // 3) Fallback names: verify(a,b,c,input) or verifyTx(a,b,c,input)
  const tried = [];

  // 1) Structured Proof + input[10]
  try {
    v.interface.getFunction("verifyTx");
    const ok = await v.verifyTx([a, b, c], input10);
    console.log("verifyTx([a,b,c], input[10]) =>", ok);
    return;
  } catch (e) { tried.push("verifyTx([a,b,c],uint[10])"); }

  // 2) IVerifier-style
  for (const name of ["verifyProof", "verify", "verifyTx"]) {
    try {
      v.interface.getFunction(name);
      const ok = await v[name](a, b, c, [0n]); // minimal input
      console.log(`${name}(a,b,c,[0]) =>`, ok);
      return;
    } catch (_) { tried.push(`${name}(a,b,c,input[])`); }
  }

  console.log("No matching verify* signature worked. Tried:", tried);
  console.log("Functions on contract:");
  console.log(funcs.join("\n"));
}

main().catch((e) => { console.error(e); process.exit(1); });
