import { eq, isNull } from 'drizzle-orm';
import {
	check,
	index,
	integer,
	sqliteTable,
	text,
	uniqueIndex,
	type AnySQLiteColumn,
} from 'drizzle-orm/sqlite-core';
import { ulid } from 'ulid';
import { AUTH_CODE_EXPIRES_IN, AUTH_TOKEN_EXPIRES_IN } from '../config.ts';
import { roles } from '../enums.ts';

export const userTable = sqliteTable(
	'user',
	{
		id: text().primaryKey().$default(ulid),
		contact: text().notNull(),
		deactivatedAt: integer({ mode: 'timestamp' }),
		deactivatedBy: text().references((): AnySQLiteColumn => userTable.id),
	},
	(table) => [
		uniqueIndex('active_user_contact_idx').on(table.contact).where(isNull(table.deactivatedAt)),
		check(
			'user_deactivated_fields_check',
			eq(isNull(table.deactivatedAt), isNull(table.deactivatedBy)),
		),
	],
);

export const userRoleTable = sqliteTable(
	'user_role',
	{
		id: text().primaryKey().$default(ulid),
		userId: text()
			.notNull()
			.references(() => userTable.id),
		role: text({ enum: roles }).notNull(),
		assignedAt: integer({ mode: 'timestamp' })
			.notNull()
			.$default(() => new Date()),
		assignedBy: text()
			.notNull()
			.references(() => userTable.id),
		revokedAt: integer({ mode: 'timestamp' }),
		revokedBy: text().references(() => userTable.id),
	},
	(table) => [
		index('user_role_user_id_idx').on(table.userId),
		uniqueIndex('active_user_role_user_id_role_idx')
			.on(table.userId, table.role)
			.where(isNull(table.revokedAt)),
		check('user_role_revoked_fields_check', eq(isNull(table.revokedAt), isNull(table.revokedBy))),
	],
);

export const loginTable = sqliteTable(
	'login',
	{
		id: text().primaryKey().$default(ulid),
		sendId: text().notNull().unique(),
		userId: text()
			.notNull()
			.references(() => userTable.id),
		code: text().notNull(),
		expiresAt: integer({ mode: 'timestamp' })
			.notNull()
			.$default(() => new Date(Date.now() + AUTH_CODE_EXPIRES_IN)),
		ip: text().notNull(),
	},
	(table) => [index('login_user_id_idx').on(table.userId)],
);

export const loginAttemptTable = sqliteTable(
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

export const tokenTable = sqliteTable('token', {
	id: text().primaryKey().$default(ulid), // jti
	userId: text()
		.notNull()
		.references(() => userTable.id),
	issuedAt: integer({ mode: 'timestamp' })
		.notNull()
		.$default(() => new Date()),
	expiresAt: integer({ mode: 'timestamp' })
		.notNull()
		.$default(() => new Date(Date.now() + AUTH_TOKEN_EXPIRES_IN)),
	ip: text().notNull(),
});

export const tokenBanTable = sqliteTable('token_ban', {
	tokenId: text()
		.primaryKey()
		.references(() => tokenTable.id),
	type: text({ enum: ['logout', 'refresh', 'deactivate'] }).notNull(),
	effectiveAt: integer({ mode: 'timestamp' }).notNull(),
	bannedAt: integer({ mode: 'timestamp' })
		.notNull()
		.$default(() => new Date()),
	bannedBy: text()
		.notNull()
		.references(() => userTable.id),
	ip: text().notNull(),
});
