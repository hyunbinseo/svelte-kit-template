import { db } from '#lib/server/database/client.ts';
import { getRequestEvent, query } from '$app/server';
import { error } from '@sveltejs/kit';

export const getSelf = query(async () => {
	const event = getRequestEvent();
	if (!event.locals.session) return null;

	const user = await db.query.userTable.findFirst({
		where: {
			id: event.locals.session.sub,
			deactivatedAt: { isNull: true },
		},
		columns: { id: true, contact: true },
	});

	if (!user) error(500);
	return user;
});
