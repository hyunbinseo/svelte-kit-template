import { requireNoSession } from '$lib/server/auth/session';
import type { PageServerLoad } from './$types';

export const load = (() => {
	requireNoSession();
	return { title: '로그인' };
}) satisfies PageServerLoad;
