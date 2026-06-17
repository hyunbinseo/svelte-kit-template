import { AUTH_COOKIE_NAME, AUTH_TOKEN_REFRESH_THRESHOLD } from '#lib/config.ts';
import { createRedirectUrl } from '#lib/server/auth/redirect.ts';
import { refreshToken, verifyToken } from '#lib/server/auth/token.ts';
import { silentDb } from '#lib/server/database/client.ts';
import { captureMessage, handleErrorWithSentry, sentryHandle, setUser } from '@sentry/sveltekit';
import type { HandleValidationError } from '@sveltejs/kit';
import { redirect } from '@sveltejs/kit';
import { sequence } from '@sveltejs/kit/hooks';
import '@valibot/i18n/ko';
import * as valibot from 'valibot';

valibot.setGlobalConfig({ lang: 'ko' });

export const handle = sequence(sentryHandle(), async ({ event, resolve }) => {
	const jwt = event.cookies.get(AUTH_COOKIE_NAME);

	if (jwt) {
		try {
			const verified = await verifyToken(jwt);

			const ban = await silentDb.query.tokenBanTable.findFirst({
				where: { tokenId: verified.payload.jti },
				columns: { effectiveAt: true },
			});

			if (ban && ban.effectiveAt <= new Date()) throw new Error();

			event.locals.session = {
				jti: verified.payload.jti,
				sub: verified.payload.sub,
				profile: verified.payload.profile !== null,
				roles: new Set(verified.payload.roles),
			};

			setUser({ id: verified.payload.sub });

			const expiresIn = verified.payload.exp * 1000 - Date.now();
			if (!ban && expiresIn <= AUTH_TOKEN_REFRESH_THRESHOLD) await refreshToken();
		} catch {
			event.cookies.delete(AUTH_COOKIE_NAME, { path: '/' });
			delete event.locals.session;
			setUser(null);
		}
	}

	if (
		event.locals.session &&
		!event.locals.session.profile &&
		event.url.pathname !== '/profile/new'
	) {
		redirect(303, createRedirectUrl('/profile/new', event));
	}

	const response = await resolve(event, {
		preload: ({ type }) => type === 'js' || type === 'css' || type === 'font',
	});

	return response;
});

export const handleError = handleErrorWithSentry();

export const handleValidationError: HandleValidationError = ({ event, issues }) => {
	captureMessage('Validation Error', { extra: { event, issues } });
	return { message: 'Bad Request' };
};
