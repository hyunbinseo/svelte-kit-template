import { dev } from '$app/env';
import { PUBLIC_SENTRY_DSN } from '$env/static/public';
import * as Sentry from '@sentry/sveltekit';
import '@valibot/i18n/ko';
import * as valibot from 'valibot';

valibot.setGlobalConfig({ lang: 'ko' });

Sentry.init({
	dsn: PUBLIC_SENTRY_DSN,
	enableLogs: true,
	sendDefaultPii: true,
	enabled: !dev,
});

export const handleError = Sentry.handleErrorWithSentry();
