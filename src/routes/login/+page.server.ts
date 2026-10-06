import { requireLoggedOut } from '#server/request.ts';
import type { PageServerLoad } from './$types.ts';

export const load = (() => {
	requireLoggedOut();
	return { title: '로그인' };
}) satisfies PageServerLoad;
