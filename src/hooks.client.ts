import { dev } from '$app/environment';
import { PUBLIC_SENTRY_DSN } from '$env/static/public';
import * as Sentry from '@sentry/sveltekit';
import type { HandleClientError } from '@sveltejs/kit';
import '@valibot/i18n/kr';
import * as valibot from 'valibot';

Sentry.init({ dsn: PUBLIC_SENTRY_DSN, enabled: !dev });
valibot.setGlobalConfig({ lang: 'kr' });

export const handleError: HandleClientError = async ({ error, event, status }) => {
	Sentry.captureException(error, { extra: { event, status } });
};
