import type { PageLoad } from './$types.ts';

export const load = (() => {
	return {
		title: '홈',
		robots: 'index',
	};
}) satisfies PageLoad;
// See https://github.com/sveltejs/kit/issues/11018
