import * as Sentry from '@sentry/node';
import { env } from 'node:process';

if (env.SENTRY_DSN) Sentry.init({ dsn: env.SENTRY_DSN, enableLogs: true });
