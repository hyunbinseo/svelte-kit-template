import { eq } from 'drizzle-orm';
import { authQueries } from '#auth/server/queries.ts';
import { createLocalClient, db as client } from '#database/app/client.ts';
import { loginAttemptTable, loginTable, userTable } from '#database/app/schema.ts';
import { picked } from '#database/pick.ts';

export const db = createLocalClient(client, (db) => ({
	...authQueries(db),

	findLogin: picked<typeof loginTable.$inferSelect>()(['id', 'contact'], (data) =>
		db.query.loginTable
			.findFirst({
				where: data,
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
	),

	recordAttempt: picked<typeof loginAttemptTable.$inferInsert>()(
		['loginId', 'isSuccessful', 'ip'],
		(data) => {
			db.insert(loginAttemptTable).values(data).run();
		},
	),

	insertUser: (contact: typeof userTable.$inferInsert.contact) =>
		db.insert(userTable).values({ contact }).returning({ id: userTable.id }).all()[0]!,

	linkUser: picked<typeof loginTable.$inferSelect>()(['id', 'userId'], ({ id, ...data }) => {
		db.update(loginTable).set(data).where(eq(loginTable.id, id)).run();
	}),
}));
