// Matches the globs in softDeleteChecks (#db/app/checks.ts), see specs/08-auth.md
export type ReasonCode = `${'admin' | 'cascade' | 'system' | 'user'}_${string}`;
