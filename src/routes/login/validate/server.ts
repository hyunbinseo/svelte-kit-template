import { eq } from 'drizzle-orm';
import { findActiveUserById, insertToken } from '#auth/server/queries.ts';
import { defineQueries } from '#database/app/client.ts';
import { loginAttemptTable, loginTable, userTable } from '#database/app/schema.ts';

export const db = defineQueries((db) => ({
	findActiveUserById: findActiveUserById(db),
	insertToken: insertToken(db),

	findLogin: ({ id, contact }: Pick<typeof loginTable.$inferSelect, 'id' | 'contact'>) =>
		db.query.loginTable
			.findFirst({
				where: { id, contact },
				columns: { userId: true, code: true, expiresAt: true, ip: true },
				with: {
					attempts: { columns: { isSuccessful: true } },
					activeUserByContact: {
						columns: { id: true },
						with: { profile: { columns: { id: true } }, activeRoles: { columns: { role: true } } },
					},
				},
			})
			.sync(),

	recordAttempt: ({
		loginId,
		isSuccessful,
		ip,
	}: Pick<typeof loginAttemptTable.$inferInsert, 'loginId' | 'isSuccessful' | 'ip'>) => {
		db.insert(loginAttemptTable).values({ loginId, isSuccessful, ip }).run();
	},

	insertUser: (contact: string) =>
		db.insert(userTable).values({ contact }).returning({ id: userTable.id }).all()[0]!,

	linkUser: (id: string, { userId }: Pick<typeof loginTable.$inferSelect, 'userId'>) => {
		db.update(loginTable).set({ userId }).where(eq(loginTable.id, id)).run();
	},
}));
