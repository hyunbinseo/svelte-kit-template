import { requireOnboarded } from '#lib/server/auth/session.ts';

export const load = () => {
	const session = requireOnboarded();
	return { userId: session.sub };
};
