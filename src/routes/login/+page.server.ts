import { requireLoggedOut } from '#lib/server/auth/session.ts';
import type { PageServerLoad } from './$types.ts';

export const load = (() => {
	requireLoggedOut();
	return { title: '로그인' };
}) satisfies PageServerLoad;
