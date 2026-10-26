import { ok } from 'node:assert/strict';
import { and, eq, gt, isNull, or } from 'drizzle-orm';
import type { SetFieldType, SetNonNullable } from 'type-fest';
import type { UserRoleRevokeReason } from '#db/app/enums/user.ts';
import type { AppDb, AppTx } from '#db/app/server/database.ts';
import { deleteLogins } from '#db/app/server/procedures/login.ts';
import {
	loginTable,
	userProfileTable,
	type UserRoleSelect,
	userRoleTable,
	type UserSelect,
	userSessionTable,
	userTable,
} from '#db/app/server/schema.ts';

const isActiveUser = (tx: AppTx, userId: UserSelect['id']) =>
	tx
		.select({ id: userTable.id })
		.from(userTable)
		.where(
			and(
				eq(userTable.id, userId), //
				isNull(userTable.closedAt),
			),
		)
		.get() !== undefined;

// null is the system, see specs/05-database.md
const isValidActor = (tx: AppTx, actorId: null | UserSelect['id']) => {
	if (actorId === null) return true;
	return isActiveUser(tx, actorId);
};

// See specs/08-auth.md
export const closeUser = (
	db: AppDb,
	user: SetNonNullable<Pick<UserSelect, 'closedBy' | 'closedReason' | 'id'>, 'closedReason'>,
) =>
	db.transaction(
		(tx) => {
			const now = new Date();

			const activeUser = tx
				.select({ contact: userTable.contact })
				.from(userTable)
				.where(
					and(
						eq(userTable.id, user.id), //
						isNull(userTable.closedAt),
					),
				)
				.get();

			if (!activeUser) return false;
			ok(activeUser.contact); // user_contact_check
			if (!isValidActor(tx, user.closedBy)) return false;

			tx.update(userTable)
				.set({
					closedAt: now,
					closedBy: user.closedBy,
					closedReason: user.closedReason,
					contact: user.closedReason === 'admin_banned' ? undefined : null,
				})
				.where(
					and(
						eq(userTable.id, user.id), //
						isNull(userTable.closedAt),
					),
				)
				.run();

			const revocation = {
				revokedAt: now,
				revokedBy: user.closedBy,
				revokedReason: 'cascade_user_closed',
			} satisfies Pick<UserRoleSelect, 'revokedAt' | 'revokedBy' | 'revokedReason'>;

			tx.update(userRoleTable)
				.set(revocation)
				.where(
					and(
						eq(userRoleTable.userId, user.id), //
						isNull(userRoleTable.revokedAt),
					),
				)
				.run();

			tx.update(userSessionTable)
				.set(revocation)
				.where(
					and(
						eq(userSessionTable.userId, user.id),
						isNull(userSessionTable.revokedAt),
						gt(userSessionTable.expiresAt, now),
					),
				)
				.run();

			tx.delete(userProfileTable).where(eq(userProfileTable.userId, user.id)).run();

			deleteLogins(
				tx,
				or(
					eq(loginTable.userId, user.id),
					eq(loginTable.contact, activeUser.contact), // logins before sign-up
				)!,
			);

			return true;
		},
		{ behavior: 'immediate' },
	);

export const grantRole = (
	db: AppDb,
	userRole: Pick<UserRoleSelect, 'assignedBy' | 'role' | 'userId'>,
) =>
	db.transaction(
		(tx) => {
			const now = new Date();

			if (!isActiveUser(tx, userRole.userId)) return;
			if (!isValidActor(tx, userRole.assignedBy)) return;

			const activeRole = tx
				.select({ id: userRoleTable.id })
				.from(userRoleTable)
				.where(
					and(
						eq(userRoleTable.userId, userRole.userId),
						eq(userRoleTable.role, userRole.role),
						isNull(userRoleTable.revokedAt),
					),
				)
				.get();

			if (activeRole) return;

			return tx
				.insert(userRoleTable)
				.values({ ...userRole, assignedAt: now })
				.returning({ id: userRoleTable.id })
				.get().id;
		},
		{ behavior: 'immediate' },
	);

export const revokeRole = (
	db: AppDb,
	userRole: SetFieldType<
		Pick<UserRoleSelect, 'revokedBy' | 'revokedReason' | 'role' | 'userId'>,
		'revokedReason',
		UserRoleRevokeReason
	>,
) =>
	db.transaction(
		(tx) => {
			const now = new Date();

			const activeRole = tx
				.select({ id: userRoleTable.id })
				.from(userRoleTable)
				.where(
					and(
						eq(userRoleTable.userId, userRole.userId),
						eq(userRoleTable.role, userRole.role),
						isNull(userRoleTable.revokedAt),
					),
				)
				.get();

			if (!activeRole) return false;
			if (!isValidActor(tx, userRole.revokedBy)) return false;

			tx.update(userRoleTable)
				.set({
					revokedAt: now,
					revokedBy: userRole.revokedBy,
					revokedReason: userRole.revokedReason,
				})
				.where(
					and(
						eq(userRoleTable.id, activeRole.id), //
						isNull(userRoleTable.revokedAt),
					),
				)
				.run();

			return true;
		},
		{ behavior: 'immediate' },
	);
