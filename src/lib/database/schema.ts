import { randomUUIDv7 } from 'node:crypto';
import { eq, isNull } from 'drizzle-orm';
import {
	check,
	index,
	integer,
	snakeCase,
	text,
	uniqueIndex,
	type AnySQLiteColumn,
} from 'drizzle-orm/sqlite-core';
import { AUTH_CODE_EXPIRES_IN, AUTH_TOKEN_EXPIRES_IN } from '#lib/config.ts';
import type { TokenBanReason, TokenRefreshReason } from '#lib/enums/token.ts';
import type { UserRole } from '#lib/enums/user.ts';
import type { ISODateString } from '#lib/types.ts';

export const userTable = snakeCase.table(
	'user',
	{
		id: text().primaryKey().$default(randomUUIDv7),
		contact: text().notNull(),
		createdBy: text().references(
			// NOTE Self-referencing foreign key requires explicit return type
			// See https://orm.drizzle.team/docs/indexes-constraints#foreign-key
			(): AnySQLiteColumn => userTable.id,
		),
		deactivatedAt: integer({ mode: 'timestamp' }),
		deactivatedBy: text().references((): AnySQLiteColumn => userTable.id),
	},
	(table) => [
		uniqueIndex('active_user_contact_idx').on(table.contact).where(isNull(table.deactivatedAt)),
	],
);

export const userProfileTable = snakeCase.table('user_profile', {
	id: text()
		.primaryKey()
		.references(() => userTable.id),
	birth: text().$type<ISODateString>().notNull(),
});

export const userRoleTable = snakeCase.table(
	'user_role',
	{
		id: text().primaryKey().$default(randomUUIDv7),
		userId: text()
			.notNull()
			.references(() => userTable.id),
		role: text().$type<UserRole>().notNull(),
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
	],
);

export const loginTable = snakeCase.table(
	'login',
	{
		id: text().primaryKey().$default(randomUUIDv7),
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

export const tokenTable = snakeCase.table(
	'token',
	{
		id: text().primaryKey().$default(randomUUIDv7), // jti
		userId: text()
			.notNull()
			.references(() => userTable.id),
		refreshedFrom: text()
			.unique()
			.references((): AnySQLiteColumn => tokenTable.id),
		refreshReason: text().$type<TokenRefreshReason>(),
		issuedAt: integer({ mode: 'timestamp' })
			.notNull()
			.$default(() => new Date()),
		expiresAt: integer({ mode: 'timestamp' })
			.notNull()
			.$default(() => new Date(Date.now() + AUTH_TOKEN_EXPIRES_IN)),
		ip: text().notNull(),
	},
	(table) => [
		check('token_refresh_info_pair', eq(isNull(table.refreshedFrom), isNull(table.refreshReason))),
	],
);

export const tokenBanTable = snakeCase.table('token_ban', {
	tokenId: text()
		.primaryKey()
		.references(() => tokenTable.id),
	reason: text().$type<TokenBanReason>().notNull(),
	effectiveAt: integer({ mode: 'timestamp' }).notNull(),
	bannedAt: integer({ mode: 'timestamp' })
		.notNull()
		.$default(() => new Date()),
	bannedBy: text()
		.notNull()
		.references(() => userTable.id),
	ip: text().notNull(),
});
