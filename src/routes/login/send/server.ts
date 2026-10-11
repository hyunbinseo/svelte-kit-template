import { eq } from 'drizzle-orm';
import { createLocalClient } from '#database/app/client.ts';
import { loginTable } from '#database/app/schema.ts';
import { picked } from '#database/pick.ts';

export const db = createLocalClient((db) => ({
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

	insertLogin: picked<typeof loginTable.$inferInsert>()(
		['contact', 'userId', 'code', 'ip'],
		(data) => db.insert(loginTable).values(data).returning({ id: loginTable.id }).all()[0]!,
	),

	markDelivered: picked<typeof loginTable.$inferSelect>()(['id', 'sendId'], ({ id, ...data }) => {
		db.update(loginTable).set(data).where(eq(loginTable.id, id)).run();
	}),

	discardLogin: (id: string) => {
		db.delete(loginTable).where(eq(loginTable.id, id)).run();
	},
}));
