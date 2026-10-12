import { createHmac, timingSafeEqual } from 'node:crypto';
import { AUTH_SECRET } from '$app/env/private';
import { logger, setUser } from '@sentry/sveltekit';
import type { Handle } from '@sveltejs/kit/hooks';
import { getCookies } from 'better-auth/cookies';
import { AUTH_SESSION_EXPIRES_IN, AUTH_SESSION_UPDATE_AGE } from '#auth/config.ts';
import { SECOND } from '#lib/time.ts';
import { auth } from './auth.ts';
import { db } from './db.ts';

const { sessionToken } = getCookies(auth.options);

// Better Auth signs the cookie as `<token>.<base64 HMAC-SHA256>` (via better-call).
const verifySessionCookie = (value: string) => {
	const index = value.lastIndexOf('.');
	if (index < 1) return undefined;

	const token = value.slice(0, index);
	const signature = Buffer.from(value.slice(index + 1));
	const expected = Buffer.from(createHmac('sha256', AUTH_SECRET).update(token).digest('base64'));

	return signature.length === expected.length && timingSafeEqual(signature, expected)
		? token
		: undefined;
};

export const handleSession: Handle = ({ event, resolve }) => {
	const value = event.cookies.get(sessionToken.name);
	if (!value) return resolve(event);

	const token = verifySessionCookie(value);
	if (!token) logger.warn('Invalid session cookie');

	const session = token && db.findLiveSessionByToken(token);
	const user = session && session.activeUser;

	if (!session || !user) {
		event.cookies.delete(sessionToken.name, { path: '/' });
		return resolve(event);
	}

	event.locals.session = {
		id: session.id,
		userId: user.id,
		profile: !!user.profile,
		roles: new Set(user.activeRoles.map((row) => row.role)),
	};

	const now = new Date();

	if (
		session.expiresAt.getTime() - AUTH_SESSION_EXPIRES_IN + AUTH_SESSION_UPDATE_AGE <=
		now.getTime()
	) {
		const expiresAt = new Date(now.getTime() + AUTH_SESSION_EXPIRES_IN);
		db.markSessionRefreshed({ id: session.id, expiresAt, updatedAt: now });
		event.cookies.set(sessionToken.name, value, {
			path: sessionToken.attributes.path,
			secure: sessionToken.attributes.secure,
			maxAge: AUTH_SESSION_EXPIRES_IN / SECOND,
		});
	}

	setUser({ id: user.id });
	event.tracing.root.setAttribute('userId', user.id);

	return resolve(event);
};
