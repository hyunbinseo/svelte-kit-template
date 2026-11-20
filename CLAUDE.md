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
