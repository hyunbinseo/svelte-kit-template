import { getRequestEvent, query } from '$app/server';
import { error } from '@sveltejs/kit';
import { requireOnboarded } from '#lib/server/auth/session.ts';
import { db } from '#lib/server/database/client.ts';

export const getSelf = query(async () => {
	const event = getRequestEvent();
	if (!event.locals.session) return null;

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
