import { resolve } from '$app/paths';
import { getRequestEvent } from '$app/server';
import { error, redirect } from '@sveltejs/kit';
import { LOGIN_REDIRECT } from '#auth/config.svelte.ts';
import { AUTH_COOKIE_NAME } from '#auth/config.ts';
import type { TokenRevokeReason } from '#auth/enums.ts';
import { db } from './server.ts';

export const requireSession = () => {
	const event = getRequestEvent();
	if (!event.locals.session) error(401);
	return event.locals.session;
};

export const requireOnboarded = () => {
	const session = requireSession();

	if (!session.profile) redirect(303, resolve('onboard'));

	return session as typeof session & { profile: true };
};

export const requireLoggedOut = () => {
	const event = getRequestEvent();
	if (event.locals.session) redirect(303, LOGIN_REDIRECT);
};

export const revokeSession = (reason: TokenRevokeReason) => {
	const event = getRequestEvent();
	if (!event.locals.session) return;

	const ip = event.getClientAddress();
	const bannedAt = new Date();

	db.transaction.revokeToken({
		tokenId: event.locals.session.jti,
		bannedBy: event.locals.session.sub,
		reason,
		ip,
		bannedAt,
	});

	event.cookies.delete(AUTH_COOKIE_NAME);
	delete event.locals.session;
};
