import { env } from 'node:process';
import { init } from '@sentry/node';
import { parse } from 'valibot';
import { loadModeEnv } from '#cli/lib/shared.ts';
import { AppEnvSchema, ModeSchema } from '#lib/env.ts';
import { sentryOptions } from '#lib/sentry/options.ts';

// Preloaded with `node --import=#cli/lib/preload.ts`, for scripts run with MODE=[mode]
// Loads env files first, so Sentry can read them.
const mode = parse(ModeSchema, env.MODE);
loadModeEnv(mode);

// Never @sentry/sveltekit, see specs/02-cli-separation.md
const dsn = parse(AppEnvSchema.entries.SENTRY_DSN, env.SENTRY_DSN);
if (mode !== 'development' && dsn) init({ ...sentryOptions, dsn, environment: mode });
