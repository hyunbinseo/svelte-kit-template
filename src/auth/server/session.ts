import { resolve } from '$app/paths';
import { getRequestEvent } from '$app/server';
import { error, redirect } from '@sveltejs/kit';
import { AUTH_LOGIN_REDIRECT } from '#auth/config.svelte.ts';
import { AUTH_COOKIE_NAME } from '#auth/config.ts';
import { revokeUserSession } from '#database/app/procedures.ts';
import { db } from './db.ts';

export const requireSession = () => {
	const event = getRequestEvent();
	if (!event.locals.session) error(401);
	return event.locals.session;
};

export const requireOnboarded = () => {
	const session = requireSession();
	if (!session.isOnboarded) redirect(303, resolve('onboard'));
	return session as typeof session & { isOnboarded: true };
};

export const requireNotOnboarded = () => {
	const session = requireSession();
	if (session.isOnboarded) redirect(303, AUTH_LOGIN_REDIRECT);
	return session as typeof session & { isOnboarded: false };
};

export const getSessionRoles = () => {
	const session = requireSession();
	session.roles ??= new Set(db.findActiveUserRolesByUserId(session.userId).map((row) => row.role));
	return session.roles;
};

export const requireLoggedOut = () => {
	const event = getRequestEvent();
	if (event.locals.session) redirect(303, AUTH_LOGIN_REDIRECT);
};

export const setSessionCookie = (token: string, expiresAt: Date) => {
	getRequestEvent().cookies.set(AUTH_COOKIE_NAME, token, { expires: expiresAt });
};

export const revokeSession = () => {
	const event = getRequestEvent();
	if (!event.locals.session) return;

	db.runProcedure(revokeUserSession, event.locals.session.id, {
		revokedBy: event.locals.session.userId,
		reason: 'logout',
	});

	event.cookies.delete(AUTH_COOKIE_NAME);
	delete event.locals.session;
};
