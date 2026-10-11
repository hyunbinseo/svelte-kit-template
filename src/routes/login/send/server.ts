import { eq } from 'drizzle-orm';
import { defineQueries } from '#database/app/client.ts';
import { loginTable } from '#database/app/schema.ts';
import type { AppInsert, AppSelect } from '#database/app/types.ts';

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

	createLogin: ({
		contact,
		userId,
		code,
		ip,
	}: AppInsert<'loginTable', 'contact' | 'userId' | 'code' | 'ip'>) =>
		db
			.insert(loginTable)
			.values({ contact, userId, code, ip })
			.returning({ id: loginTable.id })
			.all()[0]!,

	markLoginDelivered: ({ id, sendId }: AppSelect<'loginTable', 'id' | 'sendId'>) => {
		db.update(loginTable).set({ sendId }).where(eq(loginTable.id, id)).run();
	},

	discardLogin: (id: string) => {
		db.delete(loginTable).where(eq(loginTable.id, id)).run();
	},
}));
