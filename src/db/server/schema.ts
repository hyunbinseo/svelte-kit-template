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
import { AUTH_CODE_EXPIRES_IN, AUTH_TOKEN_EXPIRES_IN } from '#auth/config.ts';
import type { TokenBanReason, TokenRefreshReason } from '#auth/enums.ts';
import type {
	CareCenterRole,
	CareCenterRoleRevokeReason,
	CareCenterType,
} from '#lib/enums/care-center.ts';
import type { ShortGrade, StudentToCareCenterRemovedReason } from '#lib/enums/student.ts';
import type { UserRole, UserRoleRevokeReason } from '#lib/enums/user.ts';
import type { ISODateString } from '#lib/types.ts';

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
		check(
			'user_deactivate_info_pair',
			eq(isNull(table.deactivatedAt), isNull(table.deactivatedBy)),
		),
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
			'user_role_revoke_info_group',
			and(
				eq(isNull(table.revokedAt), isNull(table.revokedBy)),
				eq(isNull(table.revokedBy), isNull(table.revokeReason)),
			)!,
		),
	],
);

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
	(table) => [
		index('login_contact_idx').on(table.contact),
		index('login_user_id_idx').on(table.userId),
	],
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
		index('token_user_id_idx').on(table.userId),
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

export const careCenterTable = snakeCase.table(
	'care_center',
	{
		id: text().primaryKey().$default(randomUUIDv7),
		type: text().$type<CareCenterType>().notNull(),
		fullName: text().notNull(), // e.g. 서울SOS지역아동복지센터
		name: text().notNull(), // e.g. 서울SOS
		address: text().notNull(),
		contact: text().notNull(),
		createdBy: text()
			.notNull()
			.references(() => userTable.id),
		deactivatedAt: integer({ mode: 'timestamp' }),
		deactivatedBy: text().references(() => userTable.id),
	},
	(table) => [
		check(
			'care_center_deactivate_info_pair',
			eq(isNull(table.deactivatedAt), isNull(table.deactivatedBy)),
		),
	],
);

export const careCenterUserRoleTable = snakeCase.table(
	'care_center_user_role',
	{
		id: integer().primaryKey(),
		careCenterId: text()
			.notNull()
			.references(() => careCenterTable.id),
		userId: text()
			.notNull()
			.references(() => userTable.id),
		role: text().$type<CareCenterRole>().notNull(),
		assignedAt: integer({ mode: 'timestamp' })
			.notNull()
			.$default(() => new Date()),
		assignedBy: text()
			.notNull()
			.references(() => userTable.id),
		revokedAt: integer({ mode: 'timestamp' }),
		revokedBy: text().references(() => userTable.id),
		revokeReason: text().$type<CareCenterRoleRevokeReason>(),
	},
	(table) => [
		index('care_center_user_role_user_id_idx').on(table.userId),
		uniqueIndex('active_care_center_user_role_idx')
			.on(table.careCenterId, table.userId, table.role)
			.where(isNull(table.revokedAt)),
		check(
			'care_center_user_role_revoke_info_group',
			and(
				eq(isNull(table.revokedAt), isNull(table.revokedBy)),
				eq(isNull(table.revokedBy), isNull(table.revokeReason)),
			)!,
		),
	],
);

export const studentTable = snakeCase.table(
	'student',
	{
		id: text().primaryKey().$default(randomUUIDv7),
		name: text().notNull(),
		birth: text().$type<ISODateString>().notNull(),
		grade: text().$type<ShortGrade>().notNull(),
		createdBy: text()
			.notNull()
			.references(() => userTable.id),
	},
	(table) => [index('student_name_birth_idx').on(table.name, table.birth)],
);

export const studentGradeTable = snakeCase.table(
	'student_grade',
	{
		id: integer().primaryKey(),
		studentId: text()
			.notNull()
			.references(() => studentTable.id),
		grade: text().$type<ShortGrade>().notNull(),
		createdAt: integer({ mode: 'timestamp' })
			.notNull()
			.$default(() => new Date()),
		createdBy: text()
			.notNull()
			.references(() => userTable.id),
	},
	(table) => [index('student_grade_student_id_idx').on(table.studentId)],
);

export const studentToCareCenterTable = snakeCase.table(
	'student_to_care_center',
	{
		id: integer().primaryKey(),
		studentId: text()
			.notNull()
			.references(() => studentTable.id),
		careCenterId: text()
			.notNull()
			.references(() => careCenterTable.id),
		addedAt: integer({ mode: 'timestamp' })
			.notNull()
			.$default(() => new Date()),
		addedBy: text()
			.notNull()
			.references(() => userTable.id),
		removedAt: integer({ mode: 'timestamp' }),
		removedBy: text().references(() => userTable.id),
		removedReason: text().$type<StudentToCareCenterRemovedReason>(),
	},
	(table) => [
		index('student_to_care_center_care_center_id_idx').on(table.careCenterId),
		uniqueIndex('active_student_care_center_idx')
			.on(table.studentId, table.careCenterId)
			.where(isNull(table.removedAt)),
		check(
			'student_to_care_center_removed_info_group',
			and(
				eq(isNull(table.removedAt), isNull(table.removedBy)),
				eq(isNull(table.removedBy), isNull(table.removedReason)),
			)!,
		),
	],
);
