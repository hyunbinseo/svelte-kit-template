import { eq } from 'drizzle-orm';
import { findActiveUserById, createOrFindToken } from '#auth/server/queries.ts';
import { defineQueries } from '#database/app/client.ts';
import { loginAttemptTable, loginTable, userTable } from '#database/app/schema.ts';
import type { AppInsert, AppRequired, AppSelect } from '#database/app/types.ts';

export const db = defineQueries((db) => ({
	findActiveUserById: findActiveUserById(db),
	createOrFindToken: createOrFindToken(db),

	findLoginByIdAndContact: ({ id, contact }: AppSelect<'loginTable', 'id' | 'contact'>) =>
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

	createLoginAttempt: ({
		loginId,
		isSuccessful,
		ip,
	}: AppInsert<'loginAttemptTable', 'loginId' | 'isSuccessful' | 'ip'>) => {
		db.insert(loginAttemptTable).values({ loginId, isSuccessful, ip }).run();
	},

	createUser: ({ contact }: AppInsert<'userTable', 'contact'>) =>
		db.insert(userTable).values({ contact }).returning({ id: userTable.id }).all()[0]!,

	linkLoginToUser: ({ id, userId }: AppRequired<'loginTable', 'id' | 'userId'>) => {
		db.update(loginTable).set({ userId }).where(eq(loginTable.id, id)).run();
	},
}));
