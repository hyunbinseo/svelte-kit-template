import { requireSession } from '#lib/server/auth/session.ts';

export const load = () => {
	const session = requireSession();
	return { userId: session.sub };
};
