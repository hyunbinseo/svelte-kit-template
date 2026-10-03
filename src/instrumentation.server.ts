import { dev } from '$app/env';
import { SENTRY_DSN } from '$app/env/public';
import * as Sentry from '@sentry/sveltekit';
import { SENTRY_TRACES_SAMPLE_RATE } from '#lib/config.ts';
import { dataCollection } from '#lib/server/sentry.ts';

Sentry.init({
	enabled: !dev,
	dsn: SENTRY_DSN,
	dataCollection,
	tracesSampleRate: SENTRY_TRACES_SAMPLE_RATE,
});
