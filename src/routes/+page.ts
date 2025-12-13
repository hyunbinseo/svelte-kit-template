import type { PageLoad } from './$types';

// See https://github.com/sveltejs/kit/issues/11018
export const load = (() => ({ title: 'Home' })) satisfies PageLoad;
