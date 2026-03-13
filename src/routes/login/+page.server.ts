import { requireNoSession } from '$lib/server/auth/session.ts';
import type { PageServerLoad } from './$types.ts';

export const load = (() => {
	requireNoSession();
	return { title: '로그인' };
}) satisfies PageServerLoad;
