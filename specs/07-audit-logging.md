# 07 Audit Logging

Log database queries to a separate audit DB, from both SvelteKit and CLI.

## Ideas

- Drizzle's logger runs before execution, so failed queries look successful ([drizzle-team/drizzle-orm#387](https://github.com/drizzle-team/drizzle-orm/issues/387)) — look for a way around it.
- Share request-context lookup with Sentry user tagging.
- Log the CLI script name where a request pathname would go.

## Checklist

- [ ] Off unless `DATABASE_AUDIT_URL` is set.
- [ ] Writes always logged (including `begin`/`commit`/`rollback`; CTEs count as writes); reads only when opted in.
- [ ] SQL text deduplicated by hash; each entry records time, user ID, client IP, pathname, params.
- [ ] A failed audit write blocks the query before it runs; a failed `commit` log rolls back the transaction.
- [ ] A failed `rollback` log never blocks the rollback (including savepoints) — it's reported instead.
- [ ] Nesting transactions across audited and unaudited clients throws cleanly.
- [ ] Each rule above has a test.
