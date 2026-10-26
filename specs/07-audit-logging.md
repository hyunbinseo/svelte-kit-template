# 07 Audit Logging

Log database queries to a separate audit DB, from both SvelteKit and CLI.

## Ideas

- Drizzle's logger runs before execution, so failed queries look successful ([drizzle-team/drizzle-orm#387](https://github.com/drizzle-team/drizzle-orm/issues/387)) — look for a way around it.
- Share request-context lookup with Sentry user tagging.
- Log the CLI script name where a request pathname would go.

## Checklist

- [ ] Off in development, on in every other mode (`isAuditEnabled` in `src/db/shared.server.ts`, see [03](./03-environment.md)).
- [ ] Writes always logged (including `begin`/`commit`/`rollback`; CTEs count as writes); reads only when opted in.
- [ ] SQL text deduplicated by hash; each entry records time, user ID, client IP, pathname, params, and whether the actor is a 개인정보취급자 (the CLI, or a user with a role).
- [ ] Entries are purged by class: 개인정보취급자 entries after 2 years, others after 3 months ([12](./12-operations.md)).
- [ ] A failed audit write blocks the query before it runs; a failed `commit` log rolls back the transaction.
- [ ] A failed `rollback` log never blocks the rollback (including savepoints) — it's reported instead.
- [ ] Nesting transactions across audited and unaudited clients throws cleanly.
- [ ] Each rule above has a test.

## Decisions

- The audit log serves two legal records, with different retention. 접속기록 (access records) cover what 개인정보취급자 (staff: admins and CLI operators) do in the system ([개인정보의 안전성 확보조치 기준](https://www.law.go.kr/행정규칙/개인정보의안전성확보조치기준) 제2조, 제8조): at least 1 year, 2 years for 50,000+ data subjects or sensitive or unique-ID data, so the template keeps 2 years. Users' own actions aren't 접속기록; only their login records must be kept, for 3 months (통신비밀보호법). With no other basis, keeping them longer would breach 제21조 ①, so other entries go after 3 months. Both bases are uncertain for a small service: whether 통신비밀보호법's login records bind it, and whether a 고시 counts as another law under 제21조 ③. The fallback for both is 제15조 ① 6호 (정당한 이익), as Naver cites for misuse prevention. Verify against current law. Named `audit`, not `access`: "access log" usually means web server request logs.
- Params are logged unmasked: without them, an entry can't show whose data a query touched (e.g. `WHERE id = ?`), which access records must show, and the logger covers every write (CLI included) without per-procedure code. Masking isn't required there; the logs must be access-controlled and protected from tampering and loss instead. Secrets never reach params: session secrets and login codes are hashed before the query ([08](./08-auth.md)). Audit rows stay in the local audit database and never go to third parties ([10](./10-observability.md)). The audit database is read only for its audit purpose, never joined with the app database in routine queries: that would undercut the separate storage 제21조 ③ requires ([08](./08-auth.md)). Retention: [12](./12-operations.md). Rejected: logging IDs only via per-procedure entries (manual, easy to miss).
