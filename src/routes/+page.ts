import type { PageLoad } from './$types';

export const load = (() => {
	return { title: '홈' };
}) satisfies PageLoad; // See https://github.com/sveltejs/kit/issues/11018
