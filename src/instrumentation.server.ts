import { dev } from '$app/env';
import { SENTRY_DSN } from '$app/env/public';
import * as Sentry from '@sentry/sveltekit';
import { SENTRY_DATA_COLLECTION, SENTRY_TRACES_SAMPLE_RATE } from '#lib/sentry.ts';

Sentry.init({
	enabled: !dev,
	dsn: SENTRY_DSN,
	dataCollection: SENTRY_DATA_COLLECTION,
	tracesSampleRate: SENTRY_TRACES_SAMPLE_RATE,
});
