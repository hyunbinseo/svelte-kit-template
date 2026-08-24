import { resolve } from '$app/paths';
import { getRequestEvent } from '$app/server';
import { error, redirect } from '@sveltejs/kit';
import { gt } from 'drizzle-orm';
import { LOGIN_REDIRECT } from '#lib/config.svelte.ts';
import { AUTH_COOKIE_NAME } from '#lib/config.ts';
import { tokenBanTable } from '#lib/database/schema.ts';
import type { TokenRevokeReason } from '#lib/enums/token.ts';
import { db } from '../database/client.ts';
import { createRedirectUrl } from './redirect.ts';

const onboardPath = resolve('/onboard');

export const requireSession = () => {
	const event = getRequestEvent();
	if (!event.locals.session) redirect(303, createRedirectUrl('/login'));
	return event.locals.session;
};

export const requireOnboarded = () => {
	const session = requireSession();

	if (!session.profile) {
		const event = getRequestEvent();
		if (event.url.pathname === onboardPath) error(500);
		redirect(303, createRedirectUrl(onboardPath));
	}

	return session as typeof session & { profile: true };
};

export const requireLoggedOut = () => {
	const event = getRequestEvent();
	if (event.locals.session) redirect(303, LOGIN_REDIRECT);
};

export const revokeSession = (reason: TokenRevokeReason) => {
	const event = getRequestEvent();
	if (!event.locals.session) return;

	const bannedAt = new Date();

	db.insert(tokenBanTable)
		.values({
			tokenId: event.locals.session.jti,
			reason,
			effectiveAt: bannedAt,
			bannedAt,
			bannedBy: event.locals.session.sub,
			ip: event.getClientAddress(),
		})
		.onConflictDoUpdate({
			target: tokenBanTable.tokenId,
			set: {
				reason,
				effectiveAt: bannedAt,
				bannedAt,
				bannedBy: event.locals.session.sub,
				ip: event.getClientAddress(),
			},
			setWhere: gt(tokenBanTable.effectiveAt, bannedAt),
		})
		.run();

	event.cookies.delete(AUTH_COOKIE_NAME, { path: '/' });
	delete event.locals.session;
};
