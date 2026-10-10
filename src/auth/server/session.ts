import { resolve } from '$app/paths';
import { getRequestEvent } from '$app/server';
import { error, redirect } from '@sveltejs/kit';
import { gt } from 'drizzle-orm';
import { AUTH_LOGIN_REDIRECT } from '#auth/config.svelte.ts';
import { AUTH_COOKIE_NAME } from '#auth/config.ts';
import type { TokenRevokeReason } from '#auth/enums.ts';
import { db } from '#database/app/client.ts';
import { tokenBanTable } from '#database/app/schema.ts';

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

export const requireNotOnboarded = () => {
	const session = requireSession();
	if (session.profile) redirect(303, AUTH_LOGIN_REDIRECT);
	return session as typeof session & { profile: false };
};

export const requireLoggedOut = () => {
	const event = getRequestEvent();
	if (event.locals.session) redirect(303, AUTH_LOGIN_REDIRECT);
};

export const revokeSession = (reason: TokenRevokeReason) => {
	const event = getRequestEvent();
	if (!event.locals.session) return;

	const ip = event.getClientAddress();
	const bannedAt = new Date();

	db.insert(tokenBanTable)
		.values({
			tokenId: event.locals.session.jti,
			reason,
			effectiveAt: bannedAt,
			bannedAt,
			bannedBy: event.locals.session.sub,
			ip,
		})
		.onConflictDoUpdate({
			target: tokenBanTable.tokenId,
			set: {
				reason,
				effectiveAt: bannedAt,
				bannedAt,
				bannedBy: event.locals.session.sub,
				ip,
			},
			setWhere: gt(tokenBanTable.effectiveAt, bannedAt),
		})
		.run();

	event.cookies.delete(AUTH_COOKIE_NAME);
	delete event.locals.session;
};
