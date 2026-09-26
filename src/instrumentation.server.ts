import { dev } from '$app/env';
import { SENTRY_DSN } from '$app/env/public';
import * as Sentry from '@sentry/sveltekit';
import { dataCollection } from '#lib/server/sentry.ts';

Sentry.init({ enabled: !dev, dsn: SENTRY_DSN, dataCollection });
