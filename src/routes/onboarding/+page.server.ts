import { requireNotOnboarded } from '#lib/server/auth/session.ts';
import type { PageServerLoad } from './$types.ts';

export const load = (() => {
	requireNotOnboarded();
}) satisfies PageServerLoad;
