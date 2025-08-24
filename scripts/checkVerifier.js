const MockVerifier = artifacts.require("MockVerifier");

module.exports = async function (callback) {
  try {
    const ver = await MockVerifier.deployed();

    const zero = '0';
    const proof = {
      A: { X: zero, Y: zero },
      B: { X: [zero, zero], Y: [zero, zero] },
      C: { X: zero, Y: zero }
    };
    const inputs10 = Array(10).fill('0'); inputs10[0] = '100';

    const ok = await ver.verifyTx(proof, inputs10);
    console.log("Mock verifier returned:", ok);
    callback();
  } catch (e) {
    console.error(e);
    callback(e);
  }
};
