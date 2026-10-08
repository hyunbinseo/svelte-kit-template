import { query } from '$app/server';
import { error } from '@sveltejs/kit';
import { requireOnboarded } from '#auth/server/session.ts';
import { db } from '#database/client.ts';
import { findCurrentUser } from './server.ts';

export const getCurrentUser = query(async () => {
	const session = requireOnboarded();
	const user = findCurrentUser(db, { id: session.sub });

	if (!user?.profile) error(500);

	return { ...user, profile: user.profile };
});
