import { requireOnboarded } from '#auth/server/session.ts';

export const load = () => {
	const session = requireOnboarded();
	return { userId: session.sub };
};
