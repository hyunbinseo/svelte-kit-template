import { requireNoSession } from '$lib/server/auth';
import type { PageServerLoad } from './$types';

export const load = (() => {
	requireNoSession();
	return { title: '로그인' };
}) satisfies PageServerLoad;
