# Privacy

The runtime classifier reads the current task text in memory. It sends no classification request and does not modify the prompt. The native Claude account and request path remain in use; the host's existing data handling still applies.

The plugin does not read files, environment variables or credentials, and does not execute subprocesses. There is no external telemetry. Live records contain model/usage fields and local timing; memory is bounded to 64 turn decisions and 1,000 request records. Raw task text is not retained by the ledger.

`persist_metrics` defaults to false. When opted in, the native plugin-owned store receives daily category/request counts and coverage information, never prompts, answers, source, paths, credentials, or prompt hashes. Retention is 30 days and at most 1,000 category rows. Historical tokens are not persisted. Unknown timestamps and bounded deduplication affect completeness.

`/router mode off` stops ongoing collection. `/router reset` clears in-memory records and, when persistence is enabled, deletes the plugin-owned persisted keys after earlier writes finish. A deletion error is reported in the command response. Disabling the plugin does not itself promise that existing stored data has been deleted; reset first when cleanup is wanted.

Development and packaging scripts run outside the plugin runtime. They read local project files, invoke the offline test CLI and create local archives. The optional CI workflow downloads official development tooling and runs no model prompts.
