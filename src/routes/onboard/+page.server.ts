import { requireNotOnboarded } from '#auth/server/session.ts';
import type { PageServerLoad } from './$types.ts';

export const load = (() => {
	requireNotOnboarded();
	return { title: '회원 정보 입력' };
}) satisfies PageServerLoad;
