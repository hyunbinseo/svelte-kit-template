import { logger, setUser } from '@sentry/sveltekit';
import type { Handle } from '@sveltejs/kit/hooks';
import {
	AUTH_COOKIE_NAME,
	AUTH_SESSION_EXPIRES_IN,
	AUTH_SESSION_REFRESH_THRESHOLD,
} from '#auth/config.ts';
import { db } from './db.ts';
import { setSessionCookie } from './session.ts';
import { parseSessionToken, verifySessionSecret } from './token.ts';

export const handleSession: Handle = ({ event, resolve }) => {
	const token = event.cookies.get(AUTH_COOKIE_NAME);
	if (!token) return resolve(event);

	const parsed = parseSessionToken(token);
	const session = parsed && db.findLiveSessionById(parsed.id);
	const isValid = !!session && verifySessionSecret(parsed.secret, session.secretHash);

	if (!parsed || (session && !isValid)) logger.warn('Invalid session token');

	if (!isValid) {
		event.cookies.delete(AUTH_COOKIE_NAME);
		return resolve(event);
	}

	event.locals.session = {
		id: session.id,
		userId: session.userId,
		isOnboarded: !!session.profile,
	};

	const now = Date.now();

	if (session.expiresAt.getTime() - now <= AUTH_SESSION_REFRESH_THRESHOLD) {
		const expiresAt = new Date(now + AUTH_SESSION_EXPIRES_IN);
		db.markSessionRefreshed({ id: session.id, expiresAt });
		setSessionCookie(token, expiresAt);
	}

	setUser({ id: session.userId });
	event.tracing.root.setAttribute('userId', session.userId);

	return resolve(event);
};
