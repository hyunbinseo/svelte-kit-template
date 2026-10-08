import { eq } from 'drizzle-orm';
import { db as client } from '#database/client.ts';
import { loginTable, type userTable } from '#database/schema.ts';
import { withTransactions } from '#database/transaction.ts';
import { pick } from '#lib/pick.ts';
import type { Database } from '../../../app.d.ts';

const findActiveUserByContact = (
	tx: Database, //
	contact: typeof userTable.$inferSelect.contact,
) =>
	tx.query.userTable
		.findFirst({
			where: { contact, deactivatedAt: { isNull: true } },
			columns: { id: true },
		})
		.sync();

const findLatestUnexpiredLogin = (
	tx: Database, //
	contact: typeof loginTable.$inferSelect.contact,
) =>
	tx.query.loginTable
		.findFirst({
			orderBy: { id: 'desc' },
			where: { contact, expiresAt: { gte: new Date() } },
			columns: {},
			with: { successfulAttempts: { columns: { id: true } } },
		})
		.sync();

const insertLogin = (
	tx: Database, //
	data: Pick<
		typeof loginTable.$inferInsert,
		| 'contact' //
		| 'userId'
		| 'code'
		| 'ip'
	>,
) =>
	tx
		.insert(loginTable)
		.values(pick(data, ['contact', 'userId', 'code', 'ip']))
		.returning({ id: loginTable.id })
		.all()[0]!;

const markDelivered = (
	db: Database, //
	data: Pick<
		typeof loginTable.$inferSelect,
		| 'id' //
		| 'sendId'
	>,
) => {
	db.update(loginTable)
		.set(pick(data, ['sendId']))
		.where(eq(loginTable.id, data.id))
		.run();
};

const discardLogin = (
	db: Database, //
	id: typeof loginTable.$inferSelect.id,
) => {
	db.delete(loginTable).where(eq(loginTable.id, id)).run();
};

export const db = withTransactions(client, {
	findActiveUserByContact,
	findLatestUnexpiredLogin,
	insertLogin,
	markDelivered,
	discardLogin,
});
