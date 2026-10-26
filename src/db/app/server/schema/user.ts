import { gt, gte, isNotNull, isNull, or, sql } from 'drizzle-orm';
import {
	type AnySQLiteColumn,
	blob,
	check,
	index,
	integer,
	snakeCase,
	text,
	uniqueIndex,
} from 'drizzle-orm/sqlite-core';
import {
	userClosedReasons,
	userRoleRevokedReasons,
	userRoles,
	userSessionRevokedReasons,
} from '#db/app/enums/user.ts';
import { softDeleteChecks } from '#db/app/server/schema/checks.ts';

export type UserInsert = typeof userTable.$inferInsert;
export type UserSelect = typeof userTable.$inferSelect;
export const userTable = snakeCase.table(
	'user',
	{
		id: integer().primaryKey({ autoIncrement: true }),
		contact: text().unique(),
		createdAt: integer({ mode: 'timestamp_ms' }).notNull(),
		createdBy: integer().references((): AnySQLiteColumn => userTable.id),
		closedAt: integer({ mode: 'timestamp_ms' }),
		closedBy: integer().references((): AnySQLiteColumn => userTable.id),
		closedReason: text({ enum: userClosedReasons }),
	},
	(t) => [
		check('user_contact_check', or(isNotNull(t.contact), isNotNull(t.closedAt))!),
		check('user_closed_at_check', gte(t.closedAt, t.createdAt)),
		...softDeleteChecks('user_closed', {
			at: t.closedAt,
			by: t.closedBy,
			reason: t.closedReason,
		}),
	],
);

export type UserProfileInsert = typeof userProfileTable.$inferInsert;
export type UserProfileSelect = typeof userProfileTable.$inferSelect;
export const userProfileTable = snakeCase.table(
	'user_profile',
	{
		userId: integer()
			.primaryKey()
			.references(() => userTable.id),
		birthDate: text().notNull(),
		createdAt: integer({ mode: 'timestamp_ms' }).notNull(),
	},
	(t) => [check('user_profile_birth_date_check', sql`${t.birthDate} is date(${t.birthDate})`)],
);

export type UserRoleInsert = typeof userRoleTable.$inferInsert;
export type UserRoleSelect = typeof userRoleTable.$inferSelect;
export const userRoleTable = snakeCase.table(
	'user_role',
	{
		id: integer().primaryKey({ autoIncrement: true }),
		userId: integer()
			.notNull()
			.references(() => userTable.id),
		role: text({ enum: userRoles }).notNull(),
		assignedAt: integer({ mode: 'timestamp_ms' }).notNull(),
		assignedBy: integer().references(() => userTable.id),
		revokedAt: integer({ mode: 'timestamp_ms' }),
		revokedBy: integer().references(() => userTable.id),
		revokedReason: text({ enum: userRoleRevokedReasons }),
	},
	(t) => [
		uniqueIndex('user_role_active_unique').on(t.userId, t.role).where(isNull(t.revokedAt)),
		check('user_role_revoked_at_check', gte(t.revokedAt, t.assignedAt)),
		...softDeleteChecks('user_role_revoked', {
			at: t.revokedAt,
			by: t.revokedBy,
			reason: t.revokedReason,
		}),
	],
);

export type UserSessionInsert = typeof userSessionTable.$inferInsert;
export type UserSessionSelect = typeof userSessionTable.$inferSelect;
export const userSessionTable = snakeCase.table(
	'user_session',
	{
		id: integer().primaryKey({ autoIncrement: true }),
		userId: integer()
			.notNull()
			.references(() => userTable.id),
		secretHash: blob({ mode: 'buffer' }).notNull(),
		createdAt: integer({ mode: 'timestamp_ms' }).notNull(),
		expiresAt: integer({ mode: 'timestamp_ms' }).notNull(),
		ip: text().notNull(),
		revokedAt: integer({ mode: 'timestamp_ms' }),
		revokedBy: integer().references(() => userTable.id),
		revokedReason: text({ enum: userSessionRevokedReasons }),
	},
	(t) => [
		index('user_session_user_id_idx').on(t.userId),
		check('user_session_secret_hash_check', sql`length(${t.secretHash}) = 32`),
		check('user_session_expires_at_check', gt(t.expiresAt, t.createdAt)),
		check('user_session_revoked_at_check', gte(t.revokedAt, t.createdAt)),
		...softDeleteChecks('user_session_revoked', {
			at: t.revokedAt,
			by: t.revokedBy,
			reason: t.revokedReason,
		}),
	],
);
