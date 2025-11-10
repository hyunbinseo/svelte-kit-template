import { dev } from '$app/environment';
import { AUTH_COOKIE_NAME } from '$lib/config';
import { verifyJWT } from '$lib/server/auth';

export const handle = async ({ event, resolve }) => {
	const jwt = event.cookies.get(AUTH_COOKIE_NAME);

	if (jwt) {
		try {
			const verified = await verifyJWT(jwt);
			event.locals.session = verified.payload;
		} catch (e) {
			if (dev) console.error(e);
			event.cookies.delete(AUTH_COOKIE_NAME, { path: '/' });
			delete event.locals.session;
		}
	}

	const response = await resolve(event);
	return response;
};
