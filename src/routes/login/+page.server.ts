import { requireLoggedOut } from '#lib/server/auth/session.ts';
import { getLoginCookie } from '#routes/login/login.server.ts';
import type { PageServerLoad } from './$types.ts';

export const load = (() => {
	requireLoggedOut();
	return { hasPendingLogin: getLoginCookie() !== undefined };
}) satisfies PageServerLoad;
