# Validation evidence — preview 0.1.0

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
