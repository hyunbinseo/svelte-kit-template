import { ok } from 'node:assert/strict';
import type { AppDb, AppTx } from '#db/app/drizzle.ts';
import { deleteUserLogins } from '#db/app/login/queries.ts';
import type {
	UserProfileSelect,
	UserRoleSelect,
	UserSelect,
	UserSessionSelect,
} from '#db/app/schema.ts';
import {
	closeActiveUser,
	createUserProfile,
	createUserRole,
	deleteUserProfile,
	extendActiveUserSession,
	findActiveUser,
	findActiveUserRole,
	findActiveUserSession,
	findUserProfile,
	revokeActiveUserRole,
	revokeActiveUserRoles,
	revokeActiveUserSession,
	revokeActiveUserSessions,
} from '#db/app/user/queries.ts';
import type { ProcedureResult } from '#db/shared/procedure.ts';
import { SESSION_LIFETIME_MS } from '#lib/auth/config.ts';
import type { UserRoleRevokeReason, UserSessionRevokeReason } from '#lib/enums/user.ts';

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
		(tx): ProcedureResult<'actor_not_found' | 'user_not_found'> => {
			const now = new Date();

			const activeUser = findActiveUser(tx, { userId });
			if (!activeUser) return { error: 'user_not_found', ok: false };
			ok(activeUser.contact); // user_contact_check
			if (!isValidActor(tx, closedBy)) return { error: 'actor_not_found', ok: false };

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

			return { ok: true };
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
		(
			tx,
		): ProcedureResult<
			'actor_not_found' | 'role_already_granted' | 'user_not_found',
			{ userRoleId: UserRoleSelect['id'] }
		> => {
			const now = new Date();

			if (!findActiveUser(tx, { userId })) return { error: 'user_not_found', ok: false };
			if (!isValidActor(tx, assignedBy)) return { error: 'actor_not_found', ok: false };
			if (findActiveUserRole(tx, { role, userId })) {
				return { error: 'role_already_granted', ok: false };
			}

			const userRoleId = createUserRole(tx, { assignedAt: now, assignedBy, role, userId });

			return { ok: true, userRoleId };
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
		(tx): ProcedureResult<'actor_not_found' | 'role_not_found'> => {
			const now = new Date();

			const activeRole = findActiveUserRole(tx, { role, userId });
			if (!activeRole) return { error: 'role_not_found', ok: false };
			if (!isValidActor(tx, revokedBy)) return { error: 'actor_not_found', ok: false };

			revokeActiveUserRole(tx, {
				revokedAt: now,
				revokedBy,
				revokedReason,
				userRoleId: activeRole.id,
			});

			return { ok: true };
		},
		{ behavior: 'immediate' },
	);

export const onboardUser = (
	db: AppDb,
	{
		birthDate,
		userId,
	}: {
		birthDate: UserProfileSelect['birthDate'];
		userId: UserProfileSelect['userId'];
	},
) =>
	db.transaction(
		(tx): ProcedureResult<'user_already_onboarded' | 'user_not_found'> => {
			const now = new Date();

			if (!findActiveUser(tx, { userId })) return { error: 'user_not_found', ok: false };
			if (findUserProfile(tx, { userId })) return { error: 'user_already_onboarded', ok: false };

			createUserProfile(tx, { birthDate, createdAt: now, userId });

			return { ok: true };
		},
		{ behavior: 'immediate' },
	);

// See specs/08-auth.md
export const extendSession = (
	db: AppDb,
	{ userSessionId }: { userSessionId: UserSessionSelect['id'] },
) =>
	db.transaction(
		(tx): ProcedureResult<'session_not_found', { expiresAt: UserSessionSelect['expiresAt'] }> => {
			const now = new Date();

			if (!findActiveUserSession(tx, { now, userSessionId })) {
				return { error: 'session_not_found', ok: false };
			}

			const expiresAt = new Date(now.getTime() + SESSION_LIFETIME_MS);
			extendActiveUserSession(tx, { expiresAt, now, userSessionId });

			return { expiresAt, ok: true };
		},
		{ behavior: 'immediate' },
	);

export const revokeSession = (
	db: AppDb,
	{
		revokedBy,
		revokedReason,
		userSessionId,
	}: {
		revokedBy: UserSessionSelect['revokedBy'];
		revokedReason: UserSessionRevokeReason;
		userSessionId: UserSessionSelect['id'];
	},
) =>
	db.transaction(
		(tx): ProcedureResult<'actor_not_found' | 'session_not_found'> => {
			const now = new Date();

			if (!findActiveUserSession(tx, { now, userSessionId })) {
				return { error: 'session_not_found', ok: false };
			}
			if (!isValidActor(tx, revokedBy)) return { error: 'actor_not_found', ok: false };

			revokeActiveUserSession(tx, {
				now,
				revokedAt: now,
				revokedBy,
				revokedReason,
				userSessionId,
			});

			return { ok: true };
		},
		{ behavior: 'immediate' },
	);
