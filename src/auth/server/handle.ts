import { captureException, setUser } from '@sentry/sveltekit';
import type { Handle } from '@sveltejs/kit/hooks';
import { AUTH_COOKIE_NAME, AUTH_TOKEN_ROTATE_THRESHOLD } from '#auth/config.ts';
import { db } from '#database/app/client.ts';
import { rotateToken, verifyToken } from './token.ts';

const findToken = (id: string) =>
	db.query.tokenTable
		.findFirst({
			where: { id },
			columns: { id: true },
			with: { bans: { columns: { reason: true, effectiveAt: true } } },
		})
		.sync();

export const handleToken: Handle = async ({ event, resolve }) => {
	const jwt = event.cookies.get(AUTH_COOKIE_NAME);
	if (!jwt) return resolve(event);

	const payload = (await verifyToken(jwt))?.payload;
	const token = payload && findToken(payload.jti);

	const now = new Date();

	if (!token || token.bans.some((ban) => ban.effectiveAt <= now)) {
		event.cookies.delete(AUTH_COOKIE_NAME);
		return resolve(event);
	}

	const pending = new Set(token.bans.map((ban) => ban.reason));

	if (!pending.has('stale')) {
		event.locals.session = {
			jti: payload.jti,
			sub: payload.sub,
			profile: payload.profile !== null,
			roles: new Set(payload.roles),
		};
	}

	if (pending.has('stale')) {
		if (!pending.has('rotate')) {
			await rotateToken(payload, 'stale').catch(captureException);
		}
	} else if (
		pending.has('rotate') ||
		payload.exp * 1000 - now.getTime() <= AUTH_TOKEN_ROTATE_THRESHOLD
	) {
		// Re-signs the existing child if a previous rotation response was lost.
		await rotateToken(payload, 'threshold').catch(captureException);
	}

	if (event.locals.session) {
		const { sub: userId } = event.locals.session;
		setUser({ id: userId });
		event.tracing.root.setAttribute('userId', userId);
	}

	return resolve(event);
};
