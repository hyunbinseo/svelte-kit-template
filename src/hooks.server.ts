import { dev } from '$app/environment';
import { AUTH_COOKIE_NAME, AUTH_TOKEN_REFRESH_FROM } from '$lib/config';
import { refreshToken, verifyToken } from '$lib/server/auth/token';
import '@valibot/i18n/kr';
import * as valibot from 'valibot';

// TODO Re-add Sentry removed due to bundling issue
// Blocked by https://github.com/sveltejs/kit/issues/15443

valibot.setGlobalConfig({ lang: 'kr' });

export const handle = async ({ event, resolve }) => {
	const jwt = event.cookies.get(AUTH_COOKIE_NAME);

	if (jwt) {
		try {
			const verified = await verifyToken(jwt);
			const expiresIn = verified.payload.exp * 1000 - Date.now();
			if (expiresIn <= AUTH_TOKEN_REFRESH_FROM) await refreshToken();
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
