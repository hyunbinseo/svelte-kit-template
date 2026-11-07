import { error, redirect, type RequestEvent } from '@sveltejs/kit';
import { db } from '#db/app/client.ts';
import { extendSession, revokeSession } from '#db/app/user/procedures.ts';
import { findActiveUserSession } from '#db/app/user/queries.ts';
import { SESSION_REFRESH_THRESHOLD_MS } from '#lib/auth/config.ts';
import { authErrorMessages } from '#lib/auth/errors.ts';
import { loadSessionRoles } from '#lib/server/auth/roles.ts';
import { formatToken, hashSessionSecret, isSameHash, parseToken } from '#lib/server/auth/token.ts';
import { resolve } from '$app/paths';
import { getRequestEvent } from '$app/server';

const SESSION_COOKIE = 'session';

export const setSessionCookie = (userSessionId: number, secret: Buffer, expiresAt: Date) => {
	getRequestEvent().cookies.set(SESSION_COOKIE, formatToken(userSessionId, secret), {
		expires: expiresAt,
		httpOnly: true,
		path: '/',
		sameSite: 'lax',
	});
};

const deleteSessionCookie = (event: RequestEvent) => {
	event.cookies.delete(SESSION_COOKIE, { path: '/' });
};

// Verifies the session cookie, refreshing or deleting it, see specs/08-auth.md
export const handleSession = (event: RequestEvent) => {
	const token = event.cookies.get(SESSION_COOKIE);
	if (token === undefined) return;

	const parsed = parseToken(token);
	const now = new Date();
	const session = parsed && findActiveUserSession(db, { now, userSessionId: parsed.id });

	if (!parsed || !session || !isSameHash(session.secretHash, hashSessionSecret(parsed.secret))) {
		deleteSessionCookie(event);
		return;
	}

	event.locals.session = {
		id: parsed.id,
		isOnboarded: session.profileUserId !== null,
		userId: session.userId,
	};

	if (session.expiresAt.getTime() - now.getTime() < SESSION_REFRESH_THRESHOLD_MS) {
		const extended = extendSession(db, { userSessionId: parsed.id });
		if (extended.ok) setSessionCookie(parsed.id, parsed.secret, extended.expiresAt);
	}
};

// Cached for the rest of the request
export const getSessionRoles = () => loadSessionRoles(db, getRequestEvent().locals);

export const logout = () => {
	const event = getRequestEvent();
	const { session } = event.locals;
	if (session) {
		revokeSession(db, {
			revokedBy: session.userId,
			revokedReason: 'user_logged_out',
			userSessionId: session.id,
		});
	}
	deleteSessionCookie(event);
	delete event.locals.session;
};

// Guards

// The error page links to the login page, see specs/09-app-shell.md
export const requireSession = () => {
	const { session } = getRequestEvent().locals;
	if (!session) error(401, authErrorMessages.unauthorized);
	return session;
};

export const requireLoggedOut = () => {
	if (getRequestEvent().locals.session) redirect(303, resolve('/'));
};

export const requireOnboarded = () => {
	const session = requireSession();
	if (!session.isOnboarded) redirect(303, resolve('/onboarding'));
	return session;
};

export const requireNotOnboarded = () => {
	const session = requireSession();
	if (session.isOnboarded) redirect(303, resolve('/'));
	return session;
};
