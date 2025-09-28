const { keccak256, toUtf8Bytes } = require("ethers");
const fs = require("fs");
const p = process.argv[2] || "evidence.json";
const data = fs.readFileSync(p, "utf8");
console.log(keccak256(toUtf8Bytes(data)));
