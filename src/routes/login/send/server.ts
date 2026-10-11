import { eq } from 'drizzle-orm';
import { defineQueries } from '#database/app/client.ts';
import { loginTable } from '#database/app/schema.ts';

export const db = defineQueries((db) => ({
	findActiveUserByContact: (contact: string) =>
		db.query.userTable
			.findFirst({
				where: { contact, deactivatedAt: { isNull: true } },
				columns: { id: true },
			})
			.sync(),

	findLatestUnexpiredLogin: (contact: string) =>
		db.query.loginTable
			.findFirst({
				orderBy: { id: 'desc' },
				where: { contact, expiresAt: { gte: new Date() } },
				columns: {},
				with: { successfulAttempts: { columns: { id: true } } },
			})
			.sync(),

	insertLogin: ({
		contact,
		userId,
		code,
		ip,
	}: Pick<typeof loginTable.$inferInsert, 'contact' | 'userId' | 'code' | 'ip'>) =>
		db
			.insert(loginTable)
			.values({ contact, userId, code, ip })
			.returning({ id: loginTable.id })
			.all()[0]!,

	markDelivered: (id: string, { sendId }: Pick<typeof loginTable.$inferSelect, 'sendId'>) => {
		db.update(loginTable).set({ sendId }).where(eq(loginTable.id, id)).run();
	},

	discardLogin: (id: string) => {
		db.delete(loginTable).where(eq(loginTable.id, id)).run();
	},
}));
