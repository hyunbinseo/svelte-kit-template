import { redirect } from '@sveltejs/kit';
import { LOGIN_REDIRECT } from '#lib/auth/config.svelte.ts';
import { requireSession } from '#server/request.ts';
import type { PageServerLoad } from './$types.ts';

export const load = (() => {
	const session = requireSession();
	if (session.profile) redirect(303, LOGIN_REDIRECT);
	return { title: '회원 정보 입력' };
}) satisfies PageServerLoad;
