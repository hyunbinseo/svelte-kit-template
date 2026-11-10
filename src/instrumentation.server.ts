import { init } from '@sentry/sveltekit';
import { isSentryEnabled, sentryKitOptions } from '#lib/sentry/kit.ts';

// Runs before the app, see https://svelte.dev/docs/kit/observability
if (isSentryEnabled) init(sentryKitOptions);
