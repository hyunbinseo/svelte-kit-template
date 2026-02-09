import { query } from '$app/server';
import { requireSession } from '$lib/server/auth/session';
import { db } from '$lib/server/database';
import { error } from '@sveltejs/kit';

export const getCurrentUser = query(async () => {
	const session = requireSession();
	const user = await db.query.userTable.findFirst({
		where: { id: session.sub },
		columns: { id: true, contact: true },
	});
	if (!user) error(500);
	return user;
});
