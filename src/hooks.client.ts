import { dev } from '$app/env';
import { SENTRY_DSN } from '$app/env/public';
import * as Sentry from '@sentry/sveltekit';
import '@valibot/i18n/ko';
import * as valibot from 'valibot';

valibot.setGlobalConfig({ lang: 'ko' });

Sentry.init({ enabled: !dev, dsn: SENTRY_DSN });

export const handleError = Sentry.handleErrorWithSentry();
