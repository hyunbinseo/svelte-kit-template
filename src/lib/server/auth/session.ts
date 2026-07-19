import { LOGIN_REDIRECT, PROFILE_REDIRECT } from '#lib/config.svelte.ts';
import { AUTH_COOKIE_NAME } from '#lib/config.ts';
import { tokenBanTable } from '#lib/database/schema.ts';
import type { TokenRevokeReason } from '#lib/enums.ts';
import { getRequestEvent } from '$app/server';
import { captureException } from '@sentry/sveltekit';
import { redirect } from '@sveltejs/kit';
import { db } from '../database/client.ts';
import { createRedirectUrl } from './redirect.ts';

export const requireSession = () => {
	const event = getRequestEvent();
	if (!event.locals.session) redirect(303, createRedirectUrl('/login'));

	if (!event.locals.session.profile && event.url.pathname !== PROFILE_REDIRECT) {
		redirect(303, createRedirectUrl(PROFILE_REDIRECT));
	}

	return event.locals.session;
};

export const requireNoSession = () => {
	const event = getRequestEvent();
	if (event.locals.session) redirect(303, LOGIN_REDIRECT);
};

export const revokeSession = async (reason: TokenRevokeReason) => {
	const event = getRequestEvent();
	if (!event.locals.session) return;

	await db
		.insert(tokenBanTable)
		.values({
			tokenId: event.locals.session.jti,
			reason,
			effectiveAt: new Date(),
			bannedBy: event.locals.session.sub,
			ip: event.getClientAddress(),
		})
		.onConflictDoUpdate({
			target: tokenBanTable.tokenId,
			set: { effectiveAt: new Date() },
		})
		.catch(captureException);

	event.cookies.delete(AUTH_COOKIE_NAME, { path: '/' });
	delete event.locals.session;
};
