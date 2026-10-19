# 13 Agent Docs

Write `AGENTS.md` (plus `CLAUDE.md` → `@AGENTS.md`) and `README.md` last, describing what the code now does.

## Ideas

- Leave out rules that tooling already enforces.
- Point to example code instead of inlining long snippets.
- Separate framework reminders (Svelte/SvelteKit APIs newer than model knowledge) from project conventions.

## Checklist

- [ ] Every convention in `AGENTS.md` matches the code.
- [ ] Every spec's `## Decisions` is reflected where relevant.
- [ ] Agents are told to use `vp`/`vpr`/`vpx`, and to ask before running migrations.
- [ ] README: features, stack, development setup, production setup, and how to upgrade a project scaffolded from an older version.
- [ ] Decisions worth keeping are moved to `docs/` or `AGENTS.md`.
- [ ] `specs/` removed once all checklists are ticked (ask first).
