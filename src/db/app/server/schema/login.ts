import { gt, sql } from 'drizzle-orm';
import { blob, check, index, integer, snakeCase, text } from 'drizzle-orm/sqlite-core';
import { userTable } from '#db/app/server/schema/user.ts';

export type LoginInsert = typeof loginTable.$inferInsert;
export type LoginSelect = typeof loginTable.$inferSelect;
export const loginTable = snakeCase.table(
	'login',
	{
		id: integer().primaryKey({ autoIncrement: true }),
		contact: text().notNull(),
		userId: integer().references(() => userTable.id),
		codeHash: blob({ mode: 'buffer' }).notNull(),
		createdAt: integer({ mode: 'timestamp_ms' }).notNull(),
		expiresAt: integer({ mode: 'timestamp_ms' }).notNull(),
		ip: text().notNull(),
		sendId: text(),
	},
	(t) => [
		index('login_contact_idx').on(t.contact),
		index('login_user_id_idx').on(t.userId),
		check('login_code_hash_check', sql`length(${t.codeHash}) = 32`),
		check('login_expires_at_check', gt(t.expiresAt, t.createdAt)),
	],
);

export type LoginAttemptInsert = typeof loginAttemptTable.$inferInsert;
export type LoginAttemptSelect = typeof loginAttemptTable.$inferSelect;
export const loginAttemptTable = snakeCase.table(
	'login_attempt',
	{
		id: integer().primaryKey({ autoIncrement: true }),
		loginId: integer()
			.notNull()
			.references(() => loginTable.id),
		success: integer({ mode: 'boolean' }).notNull(),
		attemptedAt: integer({ mode: 'timestamp_ms' }).notNull(),
		ip: text().notNull(),
	},
	(t) => [index('login_attempt_login_id_idx').on(t.loginId)],
);
