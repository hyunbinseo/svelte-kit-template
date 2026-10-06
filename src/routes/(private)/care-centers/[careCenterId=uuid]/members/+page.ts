import type { PageLoad } from './$types.ts';

export const load = (() => {
	return { title: '구성원' };
}) satisfies PageLoad;
