import { ok } from 'node:assert/strict';
import type { UserRoleRevokeReason } from '#db/app/enums/user.ts';
import type { AppDb, AppTx } from '#db/app/server/database.ts';
import { deleteUserLogins } from '#db/app/server/login/queries.ts';
import type { UserRoleSelect, UserSelect } from '#db/app/server/schema.ts';
import {
	closeActiveUser,
	createUserRole,
	deleteUserProfile,
	findActiveUser,
	findActiveUserRole,
	revokeActiveUserRole,
	revokeActiveUserRoles,
	revokeActiveUserSessions,
} from '#db/app/server/user/queries.ts';

// null is the system, see specs/05-database.md
const isValidActor = (tx: AppTx, actorId: null | UserSelect['id']) => {
	if (actorId === null) return true;
	return findActiveUser(tx, { userId: actorId }) !== undefined;
};

// See specs/08-auth.md
export const closeUser = (
	db: AppDb,
	{
		closedBy,
		closedReason,
		userId,
	}: {
		closedBy: UserSelect['closedBy'];
		closedReason: NonNullable<UserSelect['closedReason']>;
		userId: UserSelect['id'];
	},
) =>
	db.transaction(
		(tx) => {
			const now = new Date();

			const activeUser = findActiveUser(tx, { userId });
			if (!activeUser) return false;
			ok(activeUser.contact); // user_contact_check
			if (!isValidActor(tx, closedBy)) return false;

			closeActiveUser(tx, {
				closedAt: now,
				closedBy,
				closedReason,
				// banned contacts stay, so they can't sign up again
				contact: closedReason === 'admin_banned' ? activeUser.contact : null,
				userId,
			});

			revokeActiveUserRoles(tx, {
				revokedAt: now,
				revokedBy: closedBy,
				revokedReason: 'cascade_user_closed',
				userId,
			});

			revokeActiveUserSessions(tx, {
				now,
				revokedAt: now,
				revokedBy: closedBy,
				revokedReason: 'cascade_user_closed',
				userId,
			});

			deleteUserProfile(tx, { userId });
			deleteUserLogins(tx, { contact: activeUser.contact, userId });

			return true;
		},
		{ behavior: 'immediate' },
	);

export const grantRole = (
	db: AppDb,
	{
		assignedBy,
		role,
		userId,
	}: {
		assignedBy: UserRoleSelect['assignedBy'];
		role: UserRoleSelect['role'];
		userId: UserRoleSelect['userId'];
	},
) =>
	db.transaction(
		(tx) => {
			const now = new Date();

			if (!findActiveUser(tx, { userId })) return;
			if (!isValidActor(tx, assignedBy)) return;
			if (findActiveUserRole(tx, { role, userId })) return;

			return createUserRole(tx, { assignedAt: now, assignedBy, role, userId });
		},
		{ behavior: 'immediate' },
	);

export const revokeRole = (
	db: AppDb,
	{
		revokedBy,
		revokedReason,
		role,
		userId,
	}: {
		revokedBy: UserRoleSelect['revokedBy'];
		revokedReason: UserRoleRevokeReason;
		role: UserRoleSelect['role'];
		userId: UserRoleSelect['userId'];
	},
) =>
	db.transaction(
		(tx) => {
			const now = new Date();

			const activeRole = findActiveUserRole(tx, { role, userId });
			if (!activeRole) return false;
			if (!isValidActor(tx, revokedBy)) return false;

			revokeActiveUserRole(tx, {
				revokedAt: now,
				revokedBy,
				revokedReason,
				userRoleId: activeRole.id,
			});

			return true;
		},
		{ behavior: 'immediate' },
	);
