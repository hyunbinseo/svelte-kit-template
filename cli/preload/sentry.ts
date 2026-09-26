import { env } from 'node:process';
import * as Sentry from '@sentry/sveltekit';
import { dataCollection } from '#lib/server/sentry.ts';

if (env.SENTRY_DSN) Sentry.init({ dsn: env.SENTRY_DSN, dataCollection });
