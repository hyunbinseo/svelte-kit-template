import { randomUUIDv7 } from 'node:crypto';
import { index, integer, snakeCase, text } from 'drizzle-orm/sqlite-core';
import { AUTH_CODE_EXPIRES_IN } from '#auth/config.ts';
import { userTable } from './user.ts';

export const loginTable = snakeCase.table(
	'login',
	{
		id: text().primaryKey().$default(randomUUIDv7),
		sendId: text().unique(),
		contact: text().notNull(),
		userId: text().references(() => userTable.id),
		code: text().notNull(),
		expiresAt: integer({ mode: 'timestamp' })
			.notNull()
			.$default(() => new Date(Date.now() + AUTH_CODE_EXPIRES_IN)),
		ip: text().notNull(),
	},
	(table) => [index('login_contact_idx').on(table.contact)],
);

export const loginAttemptTable = snakeCase.table(
	'login_attempt',
	{
		id: integer().primaryKey(),
		loginId: text()
			.notNull()
			.references(() => loginTable.id),
		isSuccessful: integer({ mode: 'boolean' }).notNull(),
		attemptedAt: integer({ mode: 'timestamp' })
			.notNull()
			.$default(() => new Date()),
		ip: text().notNull(),
	},
	(table) => [index('login_attempt_login_id_idx').on(table.loginId)],
);
