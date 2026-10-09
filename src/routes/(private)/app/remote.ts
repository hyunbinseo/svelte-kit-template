import { query } from '$app/server';
import { error } from '@sveltejs/kit';
import { requireOnboarded } from '#auth/server/session.ts';
import { db } from './server.ts';

export const getCurrentUser = query(async () => {
	const session = requireOnboarded();
	const user = db.read.findCurrentUser(session.sub);

	if (!user?.profile) error(500);

	return { ...user, profile: user.profile };
});
