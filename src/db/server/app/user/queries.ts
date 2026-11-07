import { and, eq, gt, isNull } from 'drizzle-orm';
import type { AppDbOrTx, AppTx } from '#db/app/drizzle.ts';
import {
	type UserProfileSelect,
	userProfileTable,
	type UserRoleSelect,
	userRoleTable,
	type UserSelect,
	type UserSessionSelect,
	userSessionTable,
	userTable,
} from '#db/app/schema.ts';

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

// Closed users included: a banned user's contact stays, see specs/08-auth.md
export const findUserByContact = (
	db: AppDbOrTx,
	{ contact }: { contact: NonNullable<UserSelect['contact']> },
) =>
	db
		.select({ closedAt: userTable.closedAt, id: userTable.id })
		.from(userTable)
		.where(eq(userTable.contact, contact))
		.get();

export const createUser = (
	tx: AppTx,
	{
		contact,
		createdAt,
		createdBy,
	}: {
		contact: NonNullable<UserSelect['contact']>;
		createdAt: UserSelect['createdAt'];
		createdBy: UserSelect['createdBy'];
	},
) =>
	tx
		.insert(userTable)
		.values({ contact, createdAt, createdBy })
		.returning({ id: userTable.id })
		.get().id;

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

export const findUserProfile = (
	db: AppDbOrTx,
	{ userId }: { userId: UserProfileSelect['userId'] },
) =>
	db
		.select({ userId: userProfileTable.userId })
		.from(userProfileTable)
		.where(eq(userProfileTable.userId, userId))
		.get();

export const createUserProfile = (
	tx: AppTx,
	{
		birthDate,
		createdAt,
		userId,
	}: {
		birthDate: UserProfileSelect['birthDate'];
		createdAt: UserProfileSelect['createdAt'];
		userId: UserProfileSelect['userId'];
	},
) => tx.insert(userProfileTable).values({ birthDate, createdAt, userId }).run();

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
export const findActiveUserRoles = (
	db: AppDbOrTx,
	{ userId }: { userId: UserRoleSelect['userId'] },
) =>
	db
		.select({ role: userRoleTable.role })
		.from(userRoleTable)
		.where(
			and(
				eq(userRoleTable.userId, userId), //
				isNull(userRoleTable.revokedAt),
			),
		)
		.orderBy(userRoleTable.role)
		.all()
		.map(({ role }) => role);

// With its user's onboarding state, in one query per request, see specs/08-auth.md
export const findActiveUserSession = (
	db: AppDbOrTx,
	{ now, userSessionId }: { now: Date; userSessionId: UserSessionSelect['id'] },
) =>
	db
		.select({
			expiresAt: userSessionTable.expiresAt,
			profileUserId: userProfileTable.userId,
			secretHash: userSessionTable.secretHash,
			userId: userSessionTable.userId,
		})
		.from(userSessionTable)
		.innerJoin(userTable, eq(userTable.id, userSessionTable.userId))
		.leftJoin(userProfileTable, eq(userProfileTable.userId, userSessionTable.userId))
		.where(
			and(
				eq(userSessionTable.id, userSessionId),
				isNull(userSessionTable.revokedAt),
				gt(userSessionTable.expiresAt, now),
				isNull(userTable.closedAt),
			),
		)
		.get();

export const createUserSession = (
	tx: AppTx,
	{
		createdAt,
		expiresAt,
		ip,
		secretHash,
		userId,
	}: {
		createdAt: UserSessionSelect['createdAt'];
		expiresAt: UserSessionSelect['expiresAt'];
		ip: UserSessionSelect['ip'];
		secretHash: UserSessionSelect['secretHash'];
		userId: UserSessionSelect['userId'];
	},
) =>
	tx
		.insert(userSessionTable)
		.values({ createdAt, expiresAt, ip, secretHash, userId })
		.returning({ id: userSessionTable.id })
		.get().id;

export const extendActiveUserSession = (
	tx: AppTx,
	{
		expiresAt,
		now,
		userSessionId,
	}: {
		expiresAt: UserSessionSelect['expiresAt'];
		now: Date;
		userSessionId: UserSessionSelect['id'];
	},
) =>
	tx
		.update(userSessionTable)
		.set({ expiresAt })
		.where(
			and(
				eq(userSessionTable.id, userSessionId),
				isNull(userSessionTable.revokedAt),
				gt(userSessionTable.expiresAt, now),
			),
		)
		.run();

export const revokeActiveUserSession = (
	tx: AppTx,
	{
		now,
		revokedAt,
		revokedBy,
		revokedReason,
		userSessionId,
	}: {
		now: Date;
		revokedAt: NonNullable<UserSessionSelect['revokedAt']>;
		revokedBy: UserSessionSelect['revokedBy'];
		revokedReason: NonNullable<UserSessionSelect['revokedReason']>;
		userSessionId: UserSessionSelect['id'];
	},
) =>
	tx
		.update(userSessionTable)
		.set({ revokedAt, revokedBy, revokedReason })
		.where(
			and(
				eq(userSessionTable.id, userSessionId),
				isNull(userSessionTable.revokedAt),
				gt(userSessionTable.expiresAt, now),
			),
		)
		.run();
