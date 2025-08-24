// SPDX-License-Identifier: MIT
// This file is MIT Licensed.
//
// Copyright 2017 Christian Reitwiessner
// Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:
// The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
pragma solidity ^0.8.0;
library Pairing {
    struct G1Point {
        uint X;
        uint Y;
    }
    // Encoding of field elements is: X[0] * z + X[1]
    struct G2Point {
        uint[2] X;
        uint[2] Y;
    }
    /// @return the generator of G1
    function P1() pure internal returns (G1Point memory) {
        return G1Point(1, 2);
    }
    /// @return the generator of G2
    function P2() pure internal returns (G2Point memory) {
        return G2Point(
            [10857046999023057135944570762232829481370756359578518086990519993285655852781,
             11559732032986387107991004021392285783925812861821192530917403151452391805634],
            [8495653923123431417604973247489272438418190587263600148770280649306958101930,
             4082367875863433681332203403145435568316851327593401208105741076214120093531]
        );
    }
    /// @return the negation of p, i.e. p.addition(p.negate()) should be zero.
    function negate(G1Point memory p) pure internal returns (G1Point memory) {
        // The prime q in the base field F_q for G1
        uint q = 21888242871839275222246405745257275088696311157297823662689037894645226208583;
        if (p.X == 0 && p.Y == 0)
            return G1Point(0, 0);
        return G1Point(p.X, q - (p.Y % q));
    }
    /// @return r the sum of two points of G1
    function addition(G1Point memory p1, G1Point memory p2) internal view returns (G1Point memory r) {
        uint[4] memory input;
        input[0] = p1.X;
        input[1] = p1.Y;
        input[2] = p2.X;
        input[3] = p2.Y;
        bool success;
        assembly {
            success := staticcall(sub(gas(), 2000), 6, input, 0xc0, r, 0x60)
            // Use "invalid" to make gas estimation work
            switch success case 0 { invalid() }
        }
        require(success);
    }


    /// @return r the product of a point on G1 and a scalar, i.e.
    /// p == p.scalar_mul(1) and p.addition(p) == p.scalar_mul(2) for all points p.
    function scalar_mul(G1Point memory p, uint s) internal view returns (G1Point memory r) {
        uint[3] memory input;
        input[0] = p.X;
        input[1] = p.Y;
        input[2] = s;
        bool success;
        assembly {
            success := staticcall(sub(gas(), 2000), 7, input, 0x80, r, 0x60)
            // Use "invalid" to make gas estimation work
            switch success case 0 { invalid() }
        }
        require (success);
    }
    /// @return the result of computing the pairing check
    /// e(p1[0], p2[0]) *  .... * e(p1[n], p2[n]) == 1
    /// For example pairing([P1(), P1().negate()], [P2(), P2()]) should
    /// return true.
    function pairing(G1Point[] memory p1, G2Point[] memory p2) internal view returns (bool) {
        require(p1.length == p2.length);
        uint elements = p1.length;
        uint inputSize = elements * 6;
        uint[] memory input = new uint[](inputSize);
        for (uint i = 0; i < elements; i++)
        {
            input[i * 6 + 0] = p1[i].X;
            input[i * 6 + 1] = p1[i].Y;
            input[i * 6 + 2] = p2[i].X[1];
            input[i * 6 + 3] = p2[i].X[0];
            input[i * 6 + 4] = p2[i].Y[1];
            input[i * 6 + 5] = p2[i].Y[0];
        }
        uint[1] memory out;
        bool success;
        assembly {
            success := staticcall(sub(gas(), 2000), 8, add(input, 0x20), mul(inputSize, 0x20), out, 0x20)
            // Use "invalid" to make gas estimation work
            switch success case 0 { invalid() }
        }
        require(success);
        return out[0] != 0;
    }
    /// Convenience method for a pairing check for two pairs.
    function pairingProd2(G1Point memory a1, G2Point memory a2, G1Point memory b1, G2Point memory b2) internal view returns (bool) {
        G1Point[] memory p1 = new G1Point[](2);
        G2Point[] memory p2 = new G2Point[](2);
        p1[0] = a1;
        p1[1] = b1;
        p2[0] = a2;
        p2[1] = b2;
        return pairing(p1, p2);
    }
    /// Convenience method for a pairing check for three pairs.
    function pairingProd3(
            G1Point memory a1, G2Point memory a2,
            G1Point memory b1, G2Point memory b2,
            G1Point memory c1, G2Point memory c2
    ) internal view returns (bool) {
        G1Point[] memory p1 = new G1Point[](3);
        G2Point[] memory p2 = new G2Point[](3);
        p1[0] = a1;
        p1[1] = b1;
        p1[2] = c1;
        p2[0] = a2;
        p2[1] = b2;
        p2[2] = c2;
        return pairing(p1, p2);
    }
    /// Convenience method for a pairing check for four pairs.
    function pairingProd4(
            G1Point memory a1, G2Point memory a2,
            G1Point memory b1, G2Point memory b2,
            G1Point memory c1, G2Point memory c2,
            G1Point memory d1, G2Point memory d2
    ) internal view returns (bool) {
        G1Point[] memory p1 = new G1Point[](4);
        G2Point[] memory p2 = new G2Point[](4);
        p1[0] = a1;
        p1[1] = b1;
        p1[2] = c1;
        p1[3] = d1;
        p2[0] = a2;
        p2[1] = b2;
        p2[2] = c2;
        p2[3] = d2;
        return pairing(p1, p2);
    }
}

contract Verifier {
    using Pairing for *;
    struct VerifyingKey {
        Pairing.G1Point alpha;
        Pairing.G2Point beta;
        Pairing.G2Point gamma;
        Pairing.G2Point delta;
        Pairing.G1Point[] gamma_abc;
    }
    struct Proof {
        Pairing.G1Point a;
        Pairing.G2Point b;
        Pairing.G1Point c;
    }
    function verifyingKey() pure internal returns (VerifyingKey memory vk) {
        vk.alpha = Pairing.G1Point(uint256(0x132a1c74e79ec0a93e8546061080dc3f0d21838b159073f39bddf41abed07dd1), uint256(0x2e8d612a355b600ebb00ea259947451346c6d0ef6fa4fbedcfc42b843363229f));
        vk.beta = Pairing.G2Point([uint256(0x236712d4a522a90a4ebc45ac32c732a248a04510a9e233408c0cedc7acbfd369), uint256(0x17d1a2cdf6b963608880ce1c75d7d39a19e8525ca32c0bacd667d33d7d61c8d0)], [uint256(0x1cbe80f1fb8e0f27c49a3241f75a4f3b80e1aa6c4a630e616a8c58d5080cb13e), uint256(0x15f13912d7495167f33ecadcbd7bfad49b075b96e0ba2bc5a2513eb241e755a7)]);
        vk.gamma = Pairing.G2Point([uint256(0x04f47e921908eee92a3d3d1d96fe1bc6fc3dc7886901415a2f9f2e63ba17f9cb), uint256(0x0d1c5869cae572ed394562be83a0c201fa6eb3546f5c72b5e64f82b7c874f442)], [uint256(0x2e686bda4220fdeb499976482b018c99397752756b14aa6c0caf2d8886ab942b), uint256(0x21d45f6fb8b2facf5a73301026c78c1408f511c2a4cf0f200f1b6bf80ec42e5d)]);
        vk.delta = Pairing.G2Point([uint256(0x139908105d04acc8a73f88efc120462f697cd32bd517ff5875ed0e1d43e02cae), uint256(0x1143bb20faef246996acdcd697dd08a360ba9e25aefcf6e8d4226c1373955a4f)], [uint256(0x026bec08c16dca5e03e1cca5397f5768da78aed9264c94803650ce2c093c518b), uint256(0x04daee252fea372832fcd9d345f67796c404395222da67e07aa1778281eb1c98)]);
        vk.gamma_abc = new Pairing.G1Point[](11);
        vk.gamma_abc[0] = Pairing.G1Point(uint256(0x256ae09c194ebd6fb00ca20a84931a1dd11cb9979933c478320d0338ac8e6eb7), uint256(0x14126191d2d3bfd63e483fdb15b0da424d295150912782bf5c4f5e6cea1b9abc));
        vk.gamma_abc[1] = Pairing.G1Point(uint256(0x0260261dc7ceb5f962b6e3fb4f64b91507ee97f888add656392ce87fb8d50e55), uint256(0x07103fc67f5fabf81f2c8398e9e62c4d7bfea5c445c64ad01f2ff4d76f134933));
        vk.gamma_abc[2] = Pairing.G1Point(uint256(0x2a208c0ff2164be0eac023409e923ed7f7072cf79d4d8fe80456fa239c44dd74), uint256(0x07e4b6260e9efe32c755ddd583511c9451d7308ef0d32643842150d73bd9366e));
        vk.gamma_abc[3] = Pairing.G1Point(uint256(0x2286aef2c6302296d44e75d0456f551529c96956bf3903172c4e329ea17755f0), uint256(0x060e4389f261c4122281209e31ad2b2278c778b57106a33919e53c0fe3fb9901));
        vk.gamma_abc[4] = Pairing.G1Point(uint256(0x079ae91a196afb617002eb70a696d4a07db018968657edd10369c1cd8febd465), uint256(0x13bdfe3c82954c75147d619e98bbb424060e6d057096bf6701f0f2ceb68cc4fa));
        vk.gamma_abc[5] = Pairing.G1Point(uint256(0x0ba830331bcc490d5d1ca4500d06a5b94b383305a7d5aa864acfeb111f0d26b7), uint256(0x2fd60c226eef350790151a6fea879ae27482eeaf64f272155bdc0fc4c6df2c52));
        vk.gamma_abc[6] = Pairing.G1Point(uint256(0x088bf8fffab131a8aefb3648f20b26b34b4ecdb2e4dad6b3c27713f4f06b9fe5), uint256(0x0c27d427bff6d78faf8a65e79adc3323f52d1196d1e7252a3e66f148b72a47e0));
        vk.gamma_abc[7] = Pairing.G1Point(uint256(0x269d694465c0f61a82cab99d84dea6f11bca06bb3c44789154b72fd6addea23b), uint256(0x300dcaa4a4d17833427cf52a2f728b66a98afaaaf9128ed9c976a16f4981f801));
        vk.gamma_abc[8] = Pairing.G1Point(uint256(0x2292d1d1014acfe91eb08f28d7bc726a87586f9c3f239c5601b8ac78bd852d57), uint256(0x238d5242f3990a6a9bd3703116b4d9ee52f374fe5bd7e2e24a0e80eca0249109));
        vk.gamma_abc[9] = Pairing.G1Point(uint256(0x0e3b141b445fd10ac107cf026c29cccb6b0b4a16842e94d42d9a7c3c4ab87daa), uint256(0x2f89bd753839fdd0785eaabc2dab1326c302ed7c554ecb46070368b284cafeca));
        vk.gamma_abc[10] = Pairing.G1Point(uint256(0x24799c62e2938f22c2076559277c43159efde984669764090d3c660c0a808e8c), uint256(0x13264f53f3ae8ed5622d61aaa3dc95a312ebe28414a0fc037f52233e21ee257b));
    }
    function verify(uint[] memory input, Proof memory proof) internal view returns (uint) {
        uint256 snark_scalar_field = 21888242871839275222246405745257275088548364400416034343698204186575808495617;
        VerifyingKey memory vk = verifyingKey();
        require(input.length + 1 == vk.gamma_abc.length);
        // Compute the linear combination vk_x
        Pairing.G1Point memory vk_x = Pairing.G1Point(0, 0);
        for (uint i = 0; i < input.length; i++) {
            require(input[i] < snark_scalar_field);
            vk_x = Pairing.addition(vk_x, Pairing.scalar_mul(vk.gamma_abc[i + 1], input[i]));
        }
        vk_x = Pairing.addition(vk_x, vk.gamma_abc[0]);
        if(!Pairing.pairingProd4(
             proof.a, proof.b,
             Pairing.negate(vk_x), vk.gamma,
             Pairing.negate(proof.c), vk.delta,
             Pairing.negate(vk.alpha), vk.beta)) return 1;
        return 0;
    }
    function verifyTx(
            Proof memory proof, uint[10] memory input
        ) public view returns (bool r) {
        uint[] memory inputValues = new uint[](10);
        
        for(uint i = 0; i < input.length; i++){
            inputValues[i] = input[i];
        }
        if (verify(inputValues, proof) == 0) {
            return true;
        } else {
            return false;
        }
    }
}
