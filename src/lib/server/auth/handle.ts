import { captureException, setUser } from '@sentry/sveltekit';
import type { Handle } from '@sveltejs/kit';
import { AUTH_COOKIE_NAME, AUTH_TOKEN_ROTATE_THRESHOLD } from '#lib/config.ts';
import { silentDb } from '#lib/server/database/client.ts';
import { rotateToken, verifyToken } from './token.ts';

type Session = NonNullable<App.Locals['session']>;

export const handleJWT: Handle = async ({ event, resolve }) => {
	const jwt = event.cookies.get(AUTH_COOKIE_NAME);
	if (!jwt) return resolve(event);

	const verified = await verifyToken(jwt);

	const ban =
		verified &&
		silentDb.query.tokenBanTable
			.findFirst({
				where: { tokenId: verified.payload.jti },
				columns: { reason: true, effectiveAt: true },
			})
			.sync();

	if (!verified || (ban && ban.effectiveAt <= new Date())) {
		event.cookies.delete(AUTH_COOKIE_NAME, { path: '/' });
		return resolve(event);
	}

	const session: Session = {
		jti: verified.payload.jti,
		sub: verified.payload.sub,
		profile: verified.payload.profile !== null,
		roles: new Set(verified.payload.roles),
	};

	if (ban?.reason === 'stale') {
		await rotateToken(session, 'stale');
	} else {
		event.locals.session = session;
	}

	if (!ban) {
		const expiresIn = verified.payload.exp * 1000 - Date.now();
		if (expiresIn <= AUTH_TOKEN_ROTATE_THRESHOLD) {
			// Error can be swallowed; session is valid for this request.
			await rotateToken(session, 'threshold').catch(captureException);
		}
	}

	const userId = event.locals.session?.sub;

	if (userId) {
		setUser({ id: userId });
		event.tracing.root.setAttribute('userId', userId);
	}

	return resolve(event);
};
