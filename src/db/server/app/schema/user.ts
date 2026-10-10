import { randomUUIDv7 } from 'node:crypto';
import { and, eq, isNull } from 'drizzle-orm';
import {
	check,
	index,
	integer,
	snakeCase,
	text,
	uniqueIndex,
	type AnySQLiteColumn,
} from 'drizzle-orm/sqlite-core';
import type { UserRole, UserRoleRevokeReason } from '#lib/enums/user.ts';
import type { ISODateString } from '#lib/valibot.ts';

export const userTable = snakeCase.table(
	'user',
	{
		id: text().primaryKey().$default(randomUUIDv7),
		contact: text().notNull(),
		createdBy: text().references(
			// Self-referencing foreign key requires explicit return type.
			// See https://orm.drizzle.team/docs/indexes-constraints#foreign-key
			(): AnySQLiteColumn => userTable.id,
		),
		deactivatedAt: integer({ mode: 'timestamp' }),
		deactivatedBy: text().references((): AnySQLiteColumn => userTable.id),
	},
	(table) => [
		uniqueIndex('active_user_contact_idx').on(table.contact).where(isNull(table.deactivatedAt)),
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
