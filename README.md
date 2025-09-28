# Phase 4 — Hardhat Baseline

## Install
npm ci

## Compile
npx hardhat compile

## Test
npm test

## Demo
npx hardhat run scripts/demo.js --network hardhat

## Notes
- Fixed-size publicSignals (length 3) passed directly to the verifier.
- Mock verifier implements IGroth16Verifier (swap with a real one later).
- Tests cover: happy path, verifier=false revert, pause/roles, getters.
