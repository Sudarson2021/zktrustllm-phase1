# Scoring and Reputation Model (Specification)

Per-submission fields:
- Evidence commitment: h = H(evidence_bytes) or H(ciphertext) if encrypt-before-IPFS
- Score: s (define range; e.g., [0,1] or [0,100])
- Context: tenant_id, model_id, timestamp, policy_id

Example aggregation (EMA):
- R_t = λ * R_{t-1} + (1-λ) * s_t, where λ in (0,1)

Trust path options (state which your prototype uses):
1) Transitional oracle-gated scoring
2) Quorum-based scoring (m-of-n)
3) ZK-attested scoring: proof binds (score, commitment, context)

Threat considerations (minimum):
- Fabricated high score: mitigate via authorized grading, quorum, and/or audit challenges
- Sybil/collusion: rate limiting, stake, tenant quotas, identity/attestation
- Evidence privacy: encrypt-before-IPFS; store only ciphertext CID/hash; keys via operator policy
- Transmission cost: evidence retrieval is audit-path only; quantify overhead in evaluation
