import { LOGIN_REDIRECT } from '#lib/config.svelte.ts';
import { getRedirectUrl } from '#lib/server/auth/redirect.ts';
import { requireSession } from '#lib/server/auth/session.ts';
import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types.ts';

export const load = ((event) => {
	const session = requireSession();
	if (session.profile) redirect(303, getRedirectUrl(event) || LOGIN_REDIRECT);
	return { title: '회원 정보 입력' };
}) satisfies PageServerLoad;
