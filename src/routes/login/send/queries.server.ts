import { eq } from 'drizzle-orm';
import { loginTable } from '#database/app/schema.ts';
import type { AppDbOrTx, AppInsert, AppRequired } from '#database/app/types.ts';

export const findActiveUserByContact = (db: AppDbOrTx) => (contact: string) =>
	db.query.userTable
		.findFirst({
			where: { contact, deactivatedAt: { isNull: true } },
			columns: { id: true },
		})
		.sync();

export const findLatestUnexpiredLogin = (db: AppDbOrTx) => (contact: string) =>
	db.query.loginTable
		.findFirst({
			orderBy: { id: 'desc' },
			where: { contact, expiresAt: { gte: new Date() } },
			columns: {},
			with: { successfulAttempts: { columns: { id: true } } },
		})
		.sync();

export const createLogin =
	(db: AppDbOrTx) =>
	({ contact, userId, code, ip }: AppInsert<'loginTable', 'contact' | 'userId' | 'code' | 'ip'>) =>
		db
			.insert(loginTable)
			.values({ contact, userId, code, ip })
			.returning({ id: loginTable.id })
			.all()[0]!;

export const markLoginDelivered =
	(db: AppDbOrTx) =>
	({ id, sendId }: AppRequired<'loginTable', 'id' | 'sendId'>) => {
		db.update(loginTable).set({ sendId }).where(eq(loginTable.id, id)).run();
	};

export const discardLogin = (db: AppDbOrTx) => (id: string) => {
	db.delete(loginTable).where(eq(loginTable.id, id)).run();
};
