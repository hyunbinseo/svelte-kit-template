import { handleErrorWithSentry, init } from '@sentry/sveltekit';
import { isSentryEnabled, sentryKitOptions } from '#lib/sentry/kit.ts';

if (isSentryEnabled) init(sentryKitOptions);

// Logs like SvelteKit's default; captures nothing until init.
export const handleError = handleErrorWithSentry();
