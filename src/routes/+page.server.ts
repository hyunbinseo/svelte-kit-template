import { requireSession } from '$lib/server/auth';
import type { PageServerLoad } from './$types';

export const load = (() => {
	const session = requireSession();
	return {
		title: '홈',
		subject: session.sub,
	};
}) satisfies PageServerLoad; // See https://github.com/sveltejs/kit/issues/11018
