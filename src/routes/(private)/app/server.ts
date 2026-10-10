import { createLocalClient, fullyAuditedDb } from '#database/app/client.ts';
import type { userTable } from '#database/app/schema.ts';

export const db = createLocalClient(fullyAuditedDb, (db) => ({
	findCurrentUser: (id: typeof userTable.$inferSelect.id) =>
		db.query.userTable
			.findFirst({
				where: { id, deactivatedAt: { isNull: true } },
				columns: { id: true, contact: true },
				with: { profile: { columns: { birth: true } } },
			})
			.sync(),
}));
