import { dev } from '$app/environment';
import { AUTH_COOKIE_NAME, AUTH_TOKEN_REFRESH_FROM } from '$lib/config';
import { refreshToken, verifyToken } from '$lib/server/auth';
import { db } from '$lib/server/db/client';
import '@valibot/i18n/kr';
import * as v from 'valibot';

export const init = () => {
	v.setGlobalConfig({ lang: 'kr' });
};

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
				if (expiresIn <= AUTH_TOKEN_REFRESH_FROM) await refreshToken();
			}
		} catch (e) {
			if (dev) console.error(e);
			event.cookies.delete(AUTH_COOKIE_NAME, { path: '/' });
			delete event.locals.session;
		}
	}

	const response = await resolve(event, {
		transformPageChunk: ({ html }) => html.replace('%lang%', 'ko'),
	});

	return response;
};
