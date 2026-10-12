import { query } from '$app/server';
import { error } from '@sveltejs/kit';
import { requireOnboarded } from '#auth/server/session.ts';
import { defineReadAuditedQueries } from '#database/app/client.ts';
import * as queries from './queries.server.ts';

const db = defineReadAuditedQueries(queries);

export const getCurrentUser = query(() => {
	const session = requireOnboarded();
	const user = db.findCurrentUser(session.sub);

	if (!user) error(401);
	if (!user.profile) error(500);

	return { ...user, profile: user.profile };
});
