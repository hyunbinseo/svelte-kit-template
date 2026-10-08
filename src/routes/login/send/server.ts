import { eq } from 'drizzle-orm';
import { loginTable } from '#database/schema.ts';
import type { Database } from '../../../app.d.ts';

export const findActiveUser = (tx: Database, contact: string) =>
	tx.query.userTable
		.findFirst({
			where: { contact, deactivatedAt: { isNull: true } },
			columns: { id: true },
		})
		.sync();

export const findLatestUnexpiredLogin = (tx: Database, contact: string) =>
	tx.query.loginTable
		.findFirst({
			orderBy: { id: 'desc' },
			where: { contact, expiresAt: { gte: new Date() } },
			columns: {},
			with: { successfulAttempts: { columns: { id: true } } },
		})
		.sync();

export const insertLogin = (
	tx: Database,
	data: Pick<typeof loginTable.$inferInsert, 'contact' | 'userId' | 'code' | 'ip'>,
) => tx.insert(loginTable).values(data).returning({ id: loginTable.id }).all()[0]!;

export const markDelivered = (
	db: Database,
	{ loginId, sendId }: { loginId: string; sendId: string },
) => {
	db.update(loginTable).set({ sendId }).where(eq(loginTable.id, loginId)).run();
};

export const discardLogin = (db: Database, loginId: string) => {
	db.delete(loginTable).where(eq(loginTable.id, loginId)).run();
};
