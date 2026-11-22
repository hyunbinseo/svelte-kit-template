# CLAUDE.md

@AGENTS.md

Interim, while the rewrite is in progress:

@specs/README.md

## Rules of Thumb

For drafting and reviewing specs:

- Strict on safety, loose on taste (e.g. a `deferred` transaction's `tx` has no write methods).
- A style rule is one lint rule, off in one line. Too strict or hard to configure, it's prose for agents instead: banned names, exceptions, an example.
- Names and structure go to code review, unless they carry safety (`userId`, never `id`).
- Don't reinvent. Follow well-known patterns and link them.

## Wording

For specs and `AGENTS.md`. Review completed: 01–05.

- Shorter wins: cut any word that doesn't change the meaning.
- Let an example carry what prose would explain.
- Drop what's obvious or an implementation detail.
- A reason sits on the decision it explains.
- Plain words over jargon, and one meaning per term ("activating an older release", not "rollback").
- Inline a short exception; nest only a long one.
- Merge rules with one goal. Split a rule holding two decisions, updating every citation it renumbers.
- Tool quirks go to `AGENTS.md`, linking the upstream issue. Verify a tool's behavior before stating it.
