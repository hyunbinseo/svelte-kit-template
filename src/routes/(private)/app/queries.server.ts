import type { AppDbOrTx } from '#database/app/types.ts';

export const findCurrentUser = (db: AppDbOrTx) => (id: string) =>
	db.query.userTable
		.findFirst({
			where: { id, deactivatedAt: { isNull: true } },
			columns: { id: true, contact: true },
			with: { profile: { columns: { birth: true } } },
		})
		.sync();
