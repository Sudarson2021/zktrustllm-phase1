import fs from "fs";
import crypto from "crypto";

function keccak256(buf){ return "0x"+crypto.createHash("keccak256").update(buf).digest("hex"); }

const files = (process.argv[2] || "data")
  ? fs.readdirSync(process.argv[2]).map(f => `${process.argv[2]}/${f}`) : [];

const entries = [];
for (const f of files) {
  const st = fs.statSync(f);
  if (!st.isFile()) continue;
  const b = fs.readFileSync(f);
  entries.push({ file: f, bytes: b.length, keccak256: keccak256(b) });
}
const combined = keccak256(Buffer.from(entries.map(e => e.keccak256.slice(2)).join(""), "hex"));
const out = { created_at: new Date().toISOString(), entries, combined };
fs.writeFileSync("data_manifest.json", JSON.stringify(out, null, 2));
console.log("Wrote data_manifest.json with", entries.length, "files");
