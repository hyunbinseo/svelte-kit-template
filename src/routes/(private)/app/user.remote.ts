import { query } from '$app/server';
import { error } from '@sveltejs/kit';
import { requireOnboarded } from '#auth/server/session.ts';
import { db } from '#database/app/client.ts';

export const getCurrentUser = query(async () => {
	const session = requireOnboarded();
	const user = db.query.userTable
		.findFirst({
			where: {
				id: session.sub,
				deactivatedAt: { isNull: true },
			},
			columns: { id: true, contact: true },
			with: { profile: { columns: { birth: true } } },
		})
		.sync();

	if (!user?.profile) error(500);

	return { ...user, profile: user.profile };
});
