import { sentryOptions } from '#lib/sentry/options.ts';
import { dev, version } from '$app/env';
import { SENTRY_DSN } from '$app/env/public';

// SvelteKit only: the CLI checks its own mode (cli/lib/preload.ts).
export const isSentryEnabled = !dev && !!SENTRY_DSN;

// For the client and server init
export const sentryKitOptions = {
	...sentryOptions,
	dsn: SENTRY_DSN,
	environment: import.meta.env.MODE,
	release: version, // the commit SHA
};
