import { dev } from '$app/env';
import { SENTRY_DSN } from '$app/env/public';
import * as Sentry from '@sentry/sveltekit';
import { SENTRY_TRACES_SAMPLE_RATE } from '#lib/sentry.ts';

if (!dev && SENTRY_DSN) {
	Sentry.init({
		dsn: SENTRY_DSN,
		tracesSampleRate: SENTRY_TRACES_SAMPLE_RATE,
	});
}

export const handleError = Sentry.handleErrorWithSentry();
