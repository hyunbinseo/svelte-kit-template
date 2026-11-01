import { and, eq, gt, isNull } from 'drizzle-orm';
import type { AppDbOrTx, AppTx } from '#db/app/server/database.ts';
import {
	type UserProfileSelect,
	userProfileTable,
	type UserRoleSelect,
	userRoleTable,
	type UserSelect,
	type UserSessionSelect,
	userSessionTable,
	userTable,
} from '#db/app/server/schema.ts';

export const findActiveUser = (db: AppDbOrTx, { userId }: { userId: UserSelect['id'] }) =>
	db
		.select({ contact: userTable.contact })
		.from(userTable)
		.where(
			and(
				eq(userTable.id, userId), //
				isNull(userTable.closedAt),
			),
		)
		.get();

export const closeActiveUser = (
	tx: AppTx,
	{
		closedAt,
		closedBy,
		closedReason,
		contact,
		userId,
	}: {
		closedAt: NonNullable<UserSelect['closedAt']>;
		closedBy: UserSelect['closedBy'];
		closedReason: NonNullable<UserSelect['closedReason']>;
		contact: UserSelect['contact'];
		userId: UserSelect['id'];
	},
) =>
	tx
		.update(userTable)
		.set({ closedAt, closedBy, closedReason, contact })
		.where(
			and(
				eq(userTable.id, userId), //
				isNull(userTable.closedAt),
			),
		)
		.run();

export const deleteUserProfile = (tx: AppTx, { userId }: { userId: UserProfileSelect['userId'] }) =>
	tx.delete(userProfileTable).where(eq(userProfileTable.userId, userId)).run();

export const findActiveUserRole = (
	db: AppDbOrTx,
	{ role, userId }: { role: UserRoleSelect['role']; userId: UserRoleSelect['userId'] },
) =>
	db
		.select({ id: userRoleTable.id })
		.from(userRoleTable)
		.where(
			and(
				eq(userRoleTable.userId, userId),
				eq(userRoleTable.role, role),
				isNull(userRoleTable.revokedAt),
			),
		)
		.get();

export const createUserRole = (
	tx: AppTx,
	{
		assignedAt,
		assignedBy,
		role,
		userId,
	}: {
		assignedAt: UserRoleSelect['assignedAt'];
		assignedBy: UserRoleSelect['assignedBy'];
		role: UserRoleSelect['role'];
		userId: UserRoleSelect['userId'];
	},
) =>
	tx
		.insert(userRoleTable)
		.values({ assignedAt, assignedBy, role, userId })
		.returning({ id: userRoleTable.id })
		.get().id;

export const revokeActiveUserRole = (
	tx: AppTx,
	{
		revokedAt,
		revokedBy,
		revokedReason,
		userRoleId,
	}: {
		revokedAt: NonNullable<UserRoleSelect['revokedAt']>;
		revokedBy: UserRoleSelect['revokedBy'];
		revokedReason: NonNullable<UserRoleSelect['revokedReason']>;
		userRoleId: UserRoleSelect['id'];
	},
) =>
	tx
		.update(userRoleTable)
		.set({ revokedAt, revokedBy, revokedReason })
		.where(
			and(
				eq(userRoleTable.id, userRoleId), //
				isNull(userRoleTable.revokedAt),
			),
		)
		.run();

export const revokeActiveUserRoles = (
	tx: AppTx,
	{
		revokedAt,
		revokedBy,
		revokedReason,
		userId,
	}: {
		revokedAt: NonNullable<UserRoleSelect['revokedAt']>;
		revokedBy: UserRoleSelect['revokedBy'];
		revokedReason: NonNullable<UserRoleSelect['revokedReason']>;
		userId: UserRoleSelect['userId'];
	},
) =>
	tx
		.update(userRoleTable)
		.set({ revokedAt, revokedBy, revokedReason })
		.where(
			and(
				eq(userRoleTable.userId, userId), //
				isNull(userRoleTable.revokedAt),
			),
		)
		.run();

// Expired sessions are already invalid, so they stay as they are.
export const revokeActiveUserSessions = (
	tx: AppTx,
	{
		now,
		revokedAt,
		revokedBy,
		revokedReason,
		userId,
	}: {
		now: Date;
		revokedAt: NonNullable<UserSessionSelect['revokedAt']>;
		revokedBy: UserSessionSelect['revokedBy'];
		revokedReason: NonNullable<UserSessionSelect['revokedReason']>;
		userId: UserSessionSelect['userId'];
	},
) =>
	tx
		.update(userSessionTable)
		.set({ revokedAt, revokedBy, revokedReason })
		.where(
			and(
				eq(userSessionTable.userId, userId),
				isNull(userSessionTable.revokedAt),
				gt(userSessionTable.expiresAt, now),
			),
		)
		.run();

// Any active role makes a user staff (개인정보취급자), see specs/07-audit-logging.md
export const hasActiveUserRole = (
	db: AppDbOrTx,
	{ userId }: { userId: UserRoleSelect['userId'] },
) =>
	db
		.select({ id: userRoleTable.id })
		.from(userRoleTable)
		.where(
			and(
				eq(userRoleTable.userId, userId), //
				isNull(userRoleTable.revokedAt),
			),
		)
		.get() !== undefined;
