import { dev } from '$app/environment';
import { PUBLIC_SENTRY_DSN } from '$env/static/public';
import { AUTH_COOKIE_NAME, AUTH_TOKEN_REFRESH_THRESHOLD } from '$lib/config.ts';
import { refreshToken, verifyToken } from '$lib/server/auth/token.ts';
import { db } from '$lib/server/database.ts';
import * as Sentry from '@sentry/sveltekit';
import type { HandleServerError, HandleValidationError } from '@sveltejs/kit';
import '@valibot/i18n/ko';
import * as valibot from 'valibot';

Sentry.init({ dsn: PUBLIC_SENTRY_DSN, enabled: !dev });
valibot.setGlobalConfig({ lang: 'ko' });

export const handle = async ({ event, resolve }) => {
	const jwt = event.cookies.get(AUTH_COOKIE_NAME);

	if (jwt) {
		try {
			const verified = await verifyToken(jwt);

			const bannedToken = await db.query.tokenBanTable.findFirst({
				where: { tokenId: verified.payload.jti },
				columns: { effectiveAt: true },
			});

			if (bannedToken && bannedToken.effectiveAt <= new Date()) {
				event.cookies.delete(AUTH_COOKIE_NAME, { path: '/' });
			} else {
				event.locals.session = {
					jti: verified.payload.jti,
					sub: verified.payload.sub,
					roles: new Set(verified.payload.roles),
				};
			}

			if (!bannedToken) {
				const expiresIn = verified.payload.exp * 1000 - Date.now();
				if (expiresIn <= AUTH_TOKEN_REFRESH_THRESHOLD) await refreshToken();
			}
		} catch (e) {
			if (dev) console.error(e);
			event.cookies.delete(AUTH_COOKIE_NAME, { path: '/' });
			delete event.locals.session;
		}
	}

	const response = await resolve(event, {
		transformPageChunk: ({ html }) => html.replace('%lang%', 'ko'),
		preload: ({ type }) => type === 'js' || type === 'css' || type === 'font',
	});

	return response;
};

export const handleError: HandleServerError = async ({ error, event, status }) => {
	Sentry.captureException(error, { extra: { event, status } });
};

export const handleValidationError: HandleValidationError = ({ event, issues }) => {
	Sentry.captureMessage('Validation Error', { extra: { event, issues } });
	return { message: 'Bad Request' };
};
