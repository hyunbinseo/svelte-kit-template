import { createReadAuditedLocalClient } from '#database/app/client.ts';

export const db = createReadAuditedLocalClient((db) => ({
	findCurrentUser: (id: string) =>
		db.query.userTable
			.findFirst({
				where: { id, deactivatedAt: { isNull: true } },
				columns: { id: true, contact: true },
				with: { profile: { columns: { birth: true } } },
			})
			.sync(),
}));
