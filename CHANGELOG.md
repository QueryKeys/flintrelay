# Changelog

## 0.2.2 — 2026-10-09

- Recognize plain, conversational requests in English and Hebrew (for example "it is not working", "add a button", "תסדר את עניין הנתונים", "האפליקציה קורסת") for model and effort recommendations. Intermittent failures, memory leaks, data loss, redesigns and rebuilds from scratch count as hard problems; everyday add/update/change requests are ordinary engineering; typos, renames and summaries are bounded chores. Acknowledgements and open questions still abstain.
- Signals live in `lib/signals.ts`. They remain local heuristics, not a quality measure; model promotion is still upgrade-only and requires explicit active ownership.

## 0.2.1 — 2026-10-09

- Admit the exact Claude Code host 2.1.293 (the engine now embedded in macOS Desktop). The native offline matrix passes on 2.1.293 for all four profiles (76 default, 82 persistence-enabled, 1 configured-off and 1 effort-preserve test executions) and still passes on 2.1.290. Add a regression for session activation and promotion on 2.1.293. Other versions remain unadmitted and the version gate is unchanged.
- Run the native offline matrix for 2.1.286, 2.1.290 and 2.1.293 in CI.

## 0.1.1 — 2026-10-07

- Admit the exact macOS Desktop engine 2.1.286 after native offline compatibility checks. Terminal upgrades do not change the Desktop engine.
- Add a regression for session activation and promotion on 2.1.286 while retaining rejection of unverified hosts.
- Run the native offline matrix for both 2.1.286 and 2.1.290 in CI. Preserve explicit user ownership, effort settings and the upgrade-only policy.

## 0.1.0 — 2026-10-07

- Add native per-step model promotion with session-scoped user control.
- Default to shadow; disable automatic downgrades and effort rewriting.
- Preserve native model choices, skills, subagents, streaming and downstream errors.
- Add bounded local usage reporting and optional request-count persistence.
- Validate/test with isolated CLI 2.1.290; global installation stays unchanged.
- Quality, entitlement and savings remain unmeasured.
- Final review corrections: command coexistence, pre-turn skill authority, queued reset deletion, independent daily counters with versioned coverage, optional-clock accounting, preserved off lifecycle, and stale-turn abstention.
