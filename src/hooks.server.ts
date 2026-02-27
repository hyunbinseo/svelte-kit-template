import { dev } from '$app/environment';
import { AUTH_COOKIE_NAME } from '$lib/config';
import { verifyToken } from '$lib/server/auth/token';

export const handle = async ({ event, resolve }) => {
	const jwt = event.cookies.get(AUTH_COOKIE_NAME);

	if (jwt) {
		try {
			const verified = await verifyToken(jwt);
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
