import { randomUUIDv7 } from 'node:crypto';
import { and, eq, isNull } from 'drizzle-orm';
import {
	type AnySQLiteColumn,
	check,
	index,
	integer,
	snakeCase,
	text,
	uniqueIndex,
} from 'drizzle-orm/sqlite-core';
import type { UserRole, UserRoleRevokeReason } from '#lib/enums/user.ts';
import type { ISODateString } from '#lib/valibot.ts';

export const userTable = snakeCase.table(
	'user',
	{
		id: text().primaryKey().$default(randomUUIDv7),
		contact: text().notNull().unique(),
		name: text().notNull().default(''),
		emailVerified: integer({ mode: 'boolean' }).notNull().default(false),
		image: text(),
		createdAt: integer({ mode: 'timestamp' })
			.notNull()
			.$default(() => new Date()),
		updatedAt: integer({ mode: 'timestamp' })
			.notNull()
			.$default(() => new Date())
			.$onUpdate(() => new Date()),
		createdBy: text().references(
			// Self-referencing foreign key requires explicit return type.
			// See https://orm.drizzle.team/docs/indexes-constraints#foreign-key
			(): AnySQLiteColumn => userTable.id,
		),
		deactivatedAt: integer({ mode: 'timestamp' }),
		deactivatedBy: text().references((): AnySQLiteColumn => userTable.id),
	},
	(table) => [
		check('user_deactivate_check', eq(isNull(table.deactivatedAt), isNull(table.deactivatedBy))),
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
		revokeReason: text().$type<UserRoleRevokeReason>(),
	},
	(table) => [
		index('user_role_user_id_idx').on(table.userId),
		uniqueIndex('active_user_role_user_id_role_idx')
			.on(table.userId, table.role)
			.where(isNull(table.revokedAt)),
		check(
			'user_role_revoke_check',
			and(
				eq(isNull(table.revokedAt), isNull(table.revokedBy)),
				eq(isNull(table.revokedBy), isNull(table.revokeReason)),
			)!,
		),
	],
);

export const userSessionTable = snakeCase.table(
	'user_session',
	{
		id: text().primaryKey().$default(randomUUIDv7),
		userId: text()
			.notNull()
			.references(() => userTable.id),
		token: text().notNull().unique(),
		expiresAt: integer({ mode: 'timestamp' }).notNull(),
		ipAddress: text(),
		userAgent: text(),
		createdAt: integer({ mode: 'timestamp' }).notNull(),
		updatedAt: integer({ mode: 'timestamp' }).notNull(),
	},
	(table) => [index('user_session_user_id_idx').on(table.userId)],
);

export const userAccountTable = snakeCase.table(
	'user_account',
	{
		id: text().primaryKey().$default(randomUUIDv7),
		userId: text()
			.notNull()
			.references(() => userTable.id),
		accountId: text().notNull(),
		providerId: text().notNull(),
		accessToken: text(),
		refreshToken: text(),
		idToken: text(),
		accessTokenExpiresAt: integer({ mode: 'timestamp' }),
		refreshTokenExpiresAt: integer({ mode: 'timestamp' }),
		scope: text(),
		password: text(),
		createdAt: integer({ mode: 'timestamp' }).notNull(),
		updatedAt: integer({ mode: 'timestamp' }).notNull(),
	},
	(table) => [index('user_account_user_id_idx').on(table.userId)],
);
