# Changelog

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
