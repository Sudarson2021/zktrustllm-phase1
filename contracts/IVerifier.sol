// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IVerifier {
    struct G1Point { uint X; uint Y; }
    struct G2Point { uint[2] X; uint[2] Y; }
    struct Proof { G1Point A; G2Point B; G1Point C; }

    function verifyTx(Proof calldata proof, uint256[10] calldata input) external view returns (bool);
}
