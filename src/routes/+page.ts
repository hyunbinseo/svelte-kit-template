import type { PageLoad } from './$types.ts';

export const prerender = true;

export const load = (() => {
	return {
		title: '홈 (공개, 사전 렌더링)',
		robots: 'index',
	};
}) satisfies PageLoad;
