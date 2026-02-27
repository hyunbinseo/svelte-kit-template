import { requireSession } from '$lib/server/auth/session';
import type { PageServerLoad } from './$types';

export const load = (() => {
	requireSession();
	return { title: '홈' };
}) satisfies PageServerLoad;
