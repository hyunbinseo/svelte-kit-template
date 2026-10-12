import { eq } from 'drizzle-orm';
import { defineQueries } from '#database/app/client.ts';
import { userSessionTable } from '#database/app/schema.ts';
import type { AppRequired } from '#database/app/types.ts';

export const db = defineQueries((db) => ({
	findActiveUserById: (id: string) =>
		db.query.userTable
			.findFirst({
				where: { id, deactivatedAt: { isNull: true } },
				columns: { id: true },
			})
			.sync(),

	findLiveSessionByToken: (token: string) =>
		db.query.userSessionTable
			.findFirst({
				where: { token, expiresAt: { gt: new Date() } },
				columns: { id: true, expiresAt: true },
				with: {
					activeUser: {
						columns: { id: true },
						with: { profile: { columns: { id: true } }, activeRoles: { columns: { role: true } } },
					},
				},
			})
			.sync(),

	markSessionRefreshed: ({
		id,
		expiresAt,
		updatedAt,
	}: AppRequired<'userSessionTable', 'id' | 'expiresAt' | 'updatedAt'>) => {
		db.update(userSessionTable)
			.set({ expiresAt, updatedAt })
			.where(eq(userSessionTable.id, id))
			.run();
	},
}));
