# Rewrite Specs

`rewrite/v0.2-attempt2` rebuilds the template from a fresh `sv` scaffold.

> [!IMPORTANT]
>
> - Drafting a spec: read `rewrite/v0.2-attempt1`'s specs and code for the decisions made there.
> - Implementing a spec: use only these specs, the current tree, and upstream docs. Don't read other branches or tags. A gap in a spec is a question for the user, not something to fill from old code.

## Format

Each spec has:

- **Goal**: one sentence.
- **Rules**: one ordered list, one decision per item, numbered across subsections. Cited as "05 rule 3". A why appears only where a rule looks arbitrary.
- **Files** (when the spec adds modules): paths and their exports. Names match exactly; function bodies are free.
- **Checks**: acceptance criteria, ticked when they hold.

Specs say what must hold, not how. Config values and option names live in the code.

## Process

1. Specs are reviewed and frozen before implementation starts. Implement them in order. A spec builds on earlier ones: it may extend their files, but never changes their rules.
2. Check upstream docs (Svelte MCP, library docs) for current APIs.
3. Implement until every check holds, then tick the boxes.
4. Commit as `feat: <spec title>` (or `chore`/`refactor` as fitting), one spec per commit. The user reviews each commit before the next spec starts.

Stop and ask when a rule is unclear, wrong, or conflicts with another. An approved change lands as its own `docs(specs)` commit before the code that needs it.

## Specs

| #   | Spec                 |
| --- | -------------------- |
| 00  | Toolchain (no spec)  |
| 01  | Conventions          |
| 02  | CLI Separation       |
| 03  | Environment          |
| 04  | Build Output         |
| 05  | Database             |
| 06  | Procedures           |
| 07  | Named Queries        |
| 08  | Audit Logging        |
| 09  | E2E Harness          |
| 10  | Sessions             |
| 11  | Login and Onboarding |
| 12  | App Shell            |
| 13  | Observability        |

Specs are linked as they're drafted.

## Global Constraints

- Stack: Svelte 5 runes, SvelteKit 3 remote functions, Drizzle ORM 1 RC on `node:sqlite`, Valibot.
- Language target: ES2023 for the SvelteKit app (`src`), ESNext for CLI code.
- Ask before adding a dependency.
- Korean UI; English code and docs.
- Keep `src/routes/layout.css`'s theme, base styles, and `btn*` utilities.
- No PII in logs, errors, or telemetry.
- Comment only what neither the code nor its docs say. Where the docs explain it, link them instead.
- `vpr check`, `vpr lint`, and `vpr test` pass after every spec.
