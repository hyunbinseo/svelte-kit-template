import { env } from 'node:process';
import * as Sentry from '@sentry/sveltekit';
import { SENTRY_DATA_COLLECTION } from '#lib/sentry.ts';

if (env.SENTRY_DSN)
	Sentry.init({
		dsn: env.SENTRY_DSN,
		dataCollection: SENTRY_DATA_COLLECTION,
	});
