import type { AppDb } from '#db/app/drizzle.ts';
import {
	createLogin,
	createLoginAttempt,
	deleteLogin,
	findLoginAttempt,
	findPendingLoginByContact,
	findPendingLoginById,
	linkLoginToUser,
	markUnsentLoginSent,
} from '#db/app/login/queries.ts';
import type { LoginSelect, UserSessionSelect } from '#db/app/schema.ts';
import {
	createUser,
	createUserSession,
	findUserByContact,
	findUserProfile,
} from '#db/app/user/queries.ts';
import type { ProcedureResult } from '#db/shared/procedure.ts';
import { IS_SIGN_UP_OPEN, LOGIN_CODE_LIFETIME_MS, SESSION_LIFETIME_MS } from '#lib/auth/config.ts';
import { isSameHash } from '#lib/server/auth/token.ts';

// One pending login per contact; closed users can't log in.
// Sign-up is checked here too, so no code goes to a contact that can't sign up.
export const startLogin = (
	db: AppDb,
	{
		codeHash,
		contact,
		ip,
	}: {
		codeHash: LoginSelect['codeHash'];
		contact: LoginSelect['contact'];
		ip: LoginSelect['ip'];
	},
) =>
	db.transaction(
		(
			tx,
		): ProcedureResult<
			'login_pending' | 'sign_up_closed' | 'user_closed',
			{ loginId: LoginSelect['id'] }
		> => {
			const now = new Date();

			const user = findUserByContact(tx, { contact });
			if (user?.closedAt) return { error: 'user_closed', ok: false };
			if (!user && !IS_SIGN_UP_OPEN) return { error: 'sign_up_closed', ok: false };
			if (findPendingLoginByContact(tx, { contact, now })) {
				return { error: 'login_pending', ok: false };
			}

			const loginId = createLogin(tx, {
				codeHash,
				contact,
				createdAt: now,
				expiresAt: new Date(now.getTime() + LOGIN_CODE_LIFETIME_MS),
				ip,
				userId: user?.id ?? null,
			});

			return { loginId, ok: true };
		},
		{ behavior: 'immediate' },
	);

export const markLoginSent = (
	db: AppDb,
	{ loginId, sendId }: { loginId: LoginSelect['id']; sendId: NonNullable<LoginSelect['sendId']> },
) =>
	db.transaction(
		(tx): ProcedureResult<'login_already_sent' | 'login_not_found'> => {
			const now = new Date();

			if (!findPendingLoginById(tx, { loginId, now })) {
				return { error: 'login_not_found', ok: false };
			}
			if (markUnsentLoginSent(tx, { loginId, sendId }).changes === 0) {
				return { error: 'login_already_sent', ok: false };
			}

			return { ok: true };
		},
		{ behavior: 'immediate' },
	);

// A login whose code failed to send never took effect.
export const discardLogin = (db: AppDb, { loginId }: { loginId: LoginSelect['id'] }) =>
	db.transaction(
		(tx): ProcedureResult<'login_attempted' | 'login_not_found'> => {
			if (findLoginAttempt(tx, { loginId })) return { error: 'login_attempted', ok: false };
			if (deleteLogin(tx, { loginId }) === 0) return { error: 'login_not_found', ok: false };

			return { ok: true };
		},
		{ behavior: 'immediate' },
	);

// Records the attempt, then signs up (if open) and creates a session on a match.
// Every error but login_not_found has recorded the attempt.
export const completeLogin = (
	db: AppDb,
	{
		codeHash,
		ip,
		loginId,
		secretHash,
	}: {
		codeHash: LoginSelect['codeHash'];
		ip: LoginSelect['ip'];
		loginId: LoginSelect['id'];
		secretHash: UserSessionSelect['secretHash'];
	},
) =>
	db.transaction(
		(
			tx,
		): ProcedureResult<
			'code_mismatch' | 'login_not_found' | 'sign_up_closed' | 'user_closed',
			{
				expiresAt: UserSessionSelect['expiresAt'];
				isOnboarded: boolean;
				userSessionId: UserSessionSelect['id'];
			}
		> => {
			const now = new Date();

			const login = findPendingLoginById(tx, { loginId, now });
			if (!login) return { error: 'login_not_found', ok: false };

			const success = isSameHash(login.codeHash, codeHash);
			createLoginAttempt(tx, { attemptedAt: now, ip, loginId, success });
			if (!success) return { error: 'code_mismatch', ok: false };

			const user = findUserByContact(tx, { contact: login.contact });
			if (user?.closedAt) return { error: 'user_closed', ok: false };
			if (!user && !IS_SIGN_UP_OPEN) return { error: 'sign_up_closed', ok: false };

			const userId =
				user?.id ?? createUser(tx, { contact: login.contact, createdAt: now, createdBy: null });
			if (login.userId === null) linkLoginToUser(tx, { loginId, userId });

			const expiresAt = new Date(now.getTime() + SESSION_LIFETIME_MS);
			const userSessionId = createUserSession(tx, {
				createdAt: now,
				expiresAt,
				ip,
				secretHash,
				userId,
			});

			return {
				expiresAt,
				isOnboarded: findUserProfile(tx, { userId }) !== undefined,
				ok: true,
				userSessionId,
			};
		},
		{ behavior: 'immediate' },
	);
