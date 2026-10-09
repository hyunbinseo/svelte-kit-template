import { eq } from 'drizzle-orm';
import { db as client } from '#database/client.ts';
import { loginAttemptTable, loginTable, userTable } from '#database/schema.ts';
import { withTransactions } from '#database/transaction.ts';
import { pick } from '#lib/pick.ts';

const findLogin = (
	tx: App.Database, //
	data: Pick<
		typeof loginTable.$inferSelect,
		| 'id' //
		| 'contact'
	>,
) =>
	tx.query.loginTable
		.findFirst({
			where: pick(data, ['id', 'contact']),
			columns: { userId: true, code: true, expiresAt: true, ip: true },
			with: {
				attempts: { columns: { isSuccessful: true } },
				activeUserByContact: {
					columns: { id: true },
					with: { profile: { columns: { id: true } }, activeRoles: { columns: { role: true } } },
				},
			},
		})
		.sync();

const recordAttempt = (
	tx: App.Database, //
	data: Pick<
		typeof loginAttemptTable.$inferInsert,
		| 'loginId' //
		| 'isSuccessful'
		| 'ip'
	>,
) => {
	tx.insert(loginAttemptTable)
		.values(pick(data, ['loginId', 'isSuccessful', 'ip']))
		.run();
};

const insertUser = (
	tx: App.Database, //
	contact: typeof userTable.$inferInsert.contact,
) => tx.insert(userTable).values({ contact }).returning({ id: userTable.id }).all()[0]!;

const findUser = (
	tx: App.Database, //
	id: typeof userTable.$inferSelect.id,
) =>
	tx.query.userTable
		.findFirst({
			where: { id },
			columns: { id: true },
			with: { profile: { columns: { id: true } }, activeRoles: { columns: { role: true } } },
		})
		.sync();

const linkUser = (
	tx: App.Database, //
	data: Pick<
		typeof loginTable.$inferSelect,
		| 'id' //
		| 'userId'
	>,
) => {
	tx.update(loginTable)
		.set(pick(data, ['userId']))
		.where(eq(loginTable.id, data.id))
		.run();
};

export const db = withTransactions(client, {
	findLogin,
	recordAttempt,
	insertUser,
	findUser,
	linkUser,
});
