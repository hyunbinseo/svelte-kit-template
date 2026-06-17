import { LOGIN_REDIRECT } from '#lib/config.svelte.ts';
import { AUTH_COOKIE_NAME } from '#lib/config.ts';
import { tokenBanTable } from '#lib/database/schema.ts';
import type { Role } from '#lib/enums.ts';
import { getRequestEvent } from '$app/server';
import { captureException } from '@sentry/sveltekit';
import { error, redirect } from '@sveltejs/kit';
import { db } from '../database/client.ts';
import { createRedirectUrl } from './redirect.ts';

export const requireSession = (requiredRoles?: [Role, ...Role[]], match: 'all' | 'any' = 'any') => {
	const event = getRequestEvent();

	if (!event.locals.session) redirect(303, createRedirectUrl('/login', event));

	event.tracing.root.setAttribute('userId', event.locals.session.sub);

	if (requiredRoles) {
		const roles = event.locals.session.roles;
		if (
			(match === 'all' && !requiredRoles.every((r) => roles.has(r))) ||
			(match === 'any' && !requiredRoles.some((r) => roles.has(r)))
		) {
			error(403);
		}
	}

	return event.locals.session;
};

export const requireNoSession = () => {
	const event = getRequestEvent();
	if (event.locals.session) redirect(303, LOGIN_REDIRECT);
};

export const revokeSession = async (
	type: (typeof tokenBanTable.$inferInsert)['type'] = 'logout',
) => {
	const event = getRequestEvent();
	if (!event.locals.session) return;

	await db
		.insert(tokenBanTable)
		.values({
			tokenId: event.locals.session.jti,
			type,
			effectiveAt: new Date(),
			bannedBy: event.locals.session.sub,
			ip: event.getClientAddress(),
		})
		.catch((e) => captureException(e));

	event.cookies.delete(AUTH_COOKIE_NAME, { path: '/' });
	delete event.locals.session;
};
