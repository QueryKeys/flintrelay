# Validation evidence — preview 0.1.1

On 2026-10-07, a user's `/router doctor` result reported host 2.1.286, valid configuration and readiness false. Process inspection confirmed a separate macOS Desktop engine 2.1.286, while the terminal launcher was 2.1.290. This reproduced the preview 0.1.0 exact-host restriction. No private prompts or credentials were read.

A native integration regression reproduced the failure (`ready` false), then passed after admitting only exact 2.1.286 alongside 2.1.290. The regression exercises trusted activation and a difficult task's per-step promotion at compatible effort. Unknown hosts remain rejected, and `xhigh` effort still abstains.

The full native offline matrix passes on the macOS Desktop executable 2.1.286 and native CLI 2.1.290: 45 default, 51 persistence-enabled and 1 configured-off executions, 97 per engine and 52 distinct tests. Strict pure-module TypeScript, eight deterministic cases and strict native validation also pass. External model/stream boundaries are stubbed. Running the Desktop executable's offline harness is not a live GUI/inference certification. The CI workflow checks both exact versions; its live status is separate evidence.

No live model quality, savings or paid comparison experiment ran. Account eligibility, native cancellation and end-to-end inference remain unmeasured.

## Historical evidence — preview 0.1.0

Local evidence on 2026-10-07: macOS arm64, Node 24.15.0, isolated official CLI 2.1.290, TypeScript 5.9.3. No model prompts or live comparison experiment ran.

| Check | Result | Scope |
| --- | --- | --- |
| Default native offline suite | 44/44 | Stubbed native boundaries |
| Persistence-enabled suite | 50/50 | Includes delayed writes, reset deletion, failed streams and privacy |
| Configured-off profile | 1/1 | Clear/resume and initialization failure |
| Strict native validation | All three profiles pass | No errors/warnings |
| Local marketplace add/install | Pass in isolated configuration | Root source resolves; four options still require user configuration |
| Strict pure-module TypeScript | Pass | `lib/` only |
| Supplemental adapter TypeScript | Pass | Public 2.1.277 declarations; not authoritative 2.1.290 typing |
| Declared classifier expectations | 8/8 | Deterministic consistency; no answer-quality score |

There are 51 distinct tests and 95 successful executions across the three profiles. The workflow can reproduce the offline checks; its live GitHub status is separate evidence and is not asserted here before it runs.

One independent final review identified six Important and two Minor findings. All eight were corrected with RED→GREEN regressions: command coexistence, pre-turn skill authority, persistence/reset ordering, ring-independent daily counts, clock/accounting isolation, preserved off lifecycle, removed-turn lookup authority and migration classifier consistency. The implementing parent checked the corrections; no second independent review or production certification was performed.

A 1,000-sample classifier-only microbenchmark observed p95 0.194ms and a maximum 50.353ms, on inputs up to 99,990 characters. The largest sample's cause was not isolated. These values exclude native waits and inference; reruns and other machines may differ.

CLI 2.1.284 refuses Mods tests in its normal configuration; no experimental flag was enabled. Linux CI results, actual account eligibility, provider fallbacks, native cancellation, live quality, end-to-end latency, API savings and subscription quota savings must not be inferred from these local tests.
