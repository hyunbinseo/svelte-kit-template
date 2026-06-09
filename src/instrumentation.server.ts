import { dev } from '$app/env';
import { SENTRY_DSN } from '$app/env/public';
import * as Sentry from '@sentry/sveltekit';

Sentry.init({
	dsn: SENTRY_DSN,
	enableLogs: true,
	enabled: !dev,
});
