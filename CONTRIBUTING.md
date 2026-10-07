# Contributing

This preview prioritizes native user control and observable behavior. Before proposing new automatic routing, read the README limits and the research/validation notes.

Use Node 24.15.0, Python 3, TypeScript 5.9.3 and trusted Claude CLI 2.1.290. There are no runtime npm dependencies. Do not change global authentication or enable experimental flags to make a test pass.

```sh
python3 scripts/test-matrix.py --claude /absolute/path/to/claude
node scripts/check-cases.mjs
node scripts/benchmark.mjs
# With TypeScript 5.9.3 on your PATH:
tsc -p tsconfig.json
```

External boundaries in native tests are stubbed; tests do not submit prompts. Add a behavioral regression that fails on the old implementation before correcting a bug. Run the full matrix after material changes. Exact-host declarations are required before claiming authoritative adapter typing; public 2.1.277 declarations were supplemental during initial development.

Do not put prompts, private repositories, credentials, raw transcripts or personal paths in fixtures, issues or reports. Live quality/cost experiments need an explicit task split, budget, acceptance checks and stop conditions. Shadow recommendations alone do not establish savings.

Release maintainers bump the plugin and package versions together, run validation and marketplace install smoke checks, build with `python3 scripts/package-release.py --output /outside/project/directory`, and publish a pre-release with its checksum. A new host version requires an explicit compatibility pass. Keep the runtime free of dependencies, network calls and subprocesses.

Contributions are submitted under this repository's MIT License.
