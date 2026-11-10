import { db } from '#db/app/client.ts';
import { findActiveUser } from '#db/app/user/queries.ts';
import { requireOnboarded } from '#lib/server/auth/session.ts';
import { query } from '$app/server';

export const getCurrentUser = query(() => {
	const session = requireOnboarded();
	const user = findActiveUser(db, { userId: session.userId });
	return { contact: user?.contact ?? null };
});
