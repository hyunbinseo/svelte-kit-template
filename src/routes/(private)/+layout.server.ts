import { requireOnboarded } from '#auth/server/session.ts';
import type { LayoutServerLoad } from './$types.ts';

export const load = (() => {
	const session = requireOnboarded();
	return { userId: session.sub };
}) satisfies LayoutServerLoad;
