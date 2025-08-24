const fs = require("fs");
function readProof(path="zokrates/proof.json") {
  const obj = JSON.parse(fs.readFileSync(path, "utf8"));
  const p = obj.proof;
  const a = [p.a[0], p.a[1]];
  const b = [[p.b[0][0], p.b[0][1]], [p.b[1][0], p.b[1][1]]];
  const c = [p.c[0], p.c[1]];
  const inputs = obj.inputs || obj.input || [];
  return { a, b, c, inputs };
}
module.exports = { readProof };
