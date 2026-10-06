import { requireOnboarded } from '#server/request.ts';
import type { LayoutServerLoad } from './$types.ts';

export const load = (() => {
	const session = requireOnboarded();
	return { userId: session.sub };
}) satisfies LayoutServerLoad;
