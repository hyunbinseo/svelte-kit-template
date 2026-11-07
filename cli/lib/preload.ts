import { env } from 'node:process';
import { parse } from 'valibot';
import { loadModeEnv } from '#cli/lib/shared.ts';
import { ModeSchema } from '#lib/env.ts';

// Preloaded with `node --import=#cli/lib/preload.ts`, for scripts run with MODE=[mode]
// Loads env files first, so later setup (e.g. Sentry) can read them.
loadModeEnv(parse(ModeSchema, env.MODE));
