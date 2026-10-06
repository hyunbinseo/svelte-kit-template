import type { PageLoad } from './$types.ts';

export const load = (() => {
	return { title: '내 정보' };
}) satisfies PageLoad;
