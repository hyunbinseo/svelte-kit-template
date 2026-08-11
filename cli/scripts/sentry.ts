import { env } from 'node:process';
import * as Sentry from '@sentry/sveltekit';

if (env.SENTRY_DSN) Sentry.init({ dsn: env.SENTRY_DSN, enableLogs: true });
