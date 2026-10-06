import type { PageLoad } from './$types.ts';

export const load = (() => {
	return { title: '학생' };
}) satisfies PageLoad;
