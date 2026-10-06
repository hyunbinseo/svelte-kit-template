import { requireOnboarded } from '#server/request.ts';
import type { PageServerLoad } from './$types.ts';

export const load = (() => {
	const session = requireOnboarded();
	return { title: '센터', isAdmin: session.roles.has('admin') };
}) satisfies PageServerLoad;
