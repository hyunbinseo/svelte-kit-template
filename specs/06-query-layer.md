# 06 Query Layer

How routes, remote functions, and CLI scripts reach the database. This is the most open spec.

## Ideas

- Plain functions taking `db`, bound query sets, repository modules, or per-route `server.ts` — pick what reads best at the call site and in tests.
- Audited reads as a per-call or per-module choice.
- Enforce "sync transaction callbacks" with types.
- Domain verbs for names (`find`, `create`, `claim`, `mark`, `link`, `discard`, `grant`, `revoke`) over SQL verbs.

## Checklist

- [ ] Transactions reject async callbacks (type error and runtime error). `node:sqlite` is sync; an async callback would commit early.
- [ ] Read-then-write paths run in `immediate` transactions.
- [ ] Multi-row invariants (e.g. deactivating a user revokes their roles and sessions; granting a role requires an active user without it) live in procedures shared by SvelteKit and CLI.
- [ ] Each procedure runs in one transaction, reads the clock inside it, guards every row it depends on, returns falsy on no-op — and each guard is tested.
- [ ] Reads are not audited by default; a route can opt in.
- [ ] Drizzle's sync API is used; insert `.get()` is avoided ([drizzle-team/drizzle-orm#6107](https://github.com/drizzle-team/drizzle-orm/issues/6107)).
