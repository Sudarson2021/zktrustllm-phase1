const { keccak256, toUtf8Bytes } = require("ethers");

/**
 * Demo helper: split keccak256(prompt) into two u32 from the last 8 bytes.
 * Phase-1 only; not cryptographically strong binding.
 */
function splitPrompt(prompt) {
  const h = keccak256(toUtf8Bytes(prompt)); // 0x + 64 hex chars
  const tail = h.slice(-16);                // last 8 bytes
  const first = tail.slice(0, 8);
  const second = tail.slice(8, 16);
  return [parseInt(first, 16), parseInt(second, 16)];
}
module.exports = { splitPrompt };
