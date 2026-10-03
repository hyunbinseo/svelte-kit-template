import { dev } from '$app/env';
import { SENTRY_DSN } from '$app/env/public';
import * as Sentry from '@sentry/sveltekit';
import '@valibot/i18n/ko';
import * as valibot from 'valibot';
import { SENTRY_TRACES_SAMPLE_RATE } from '#lib/config.ts';

valibot.setGlobalConfig({ lang: 'ko' });

Sentry.init({
	enabled: !dev,
	dsn: SENTRY_DSN,
	tracesSampleRate: SENTRY_TRACES_SAMPLE_RATE,
});

export const handleError = Sentry.handleErrorWithSentry();
