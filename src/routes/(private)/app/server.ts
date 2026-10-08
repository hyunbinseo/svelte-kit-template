import { db } from '#database/client.ts';

export const findCurrentUser = (id: string) =>
	db.query.userTable
		.findFirst({
			where: { id, deactivatedAt: { isNull: true } },
			columns: { id: true, contact: true },
			with: { profile: { columns: { birth: true } } },
		})
		.sync();
