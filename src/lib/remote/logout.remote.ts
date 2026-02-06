import { resolve } from '$app/paths';
import { form, getRequestEvent } from '$app/server';
import { AUTH_COOKIE_NAME } from '$lib/config';
import { tokenBanTable } from '$lib/database/schema';
import { db } from '$lib/server/database';
import { redirect } from '@sveltejs/kit';

export const logout = form(async () => {
	const event = getRequestEvent();
	if (!event.locals.session) return;

	await db.insert(tokenBanTable).values({
		tokenId: event.locals.session.jti,
		type: 'logout',
		effectiveAt: new Date(),
		bannedBy: event.locals.session.sub,
		ip: event.getClientAddress(),
	});

	event.cookies.delete(AUTH_COOKIE_NAME, { path: '/' });
	delete event.locals.session;

	redirect(303, resolve('/login'));
});
