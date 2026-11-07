import { and, eq, gt, inArray, isNull, lt, notExists, or, type SQL } from 'drizzle-orm';
import type { AppDbOrTx, AppTx } from '#db/app/drizzle.ts';
import {
	type LoginAttemptSelect,
	loginAttemptTable,
	type LoginSelect,
	loginTable,
} from '#db/app/schema.ts';
import { LOGIN_MAX_ATTEMPTS } from '#lib/auth/config.ts';

// Unexpired, with attempts left, and not yet used
const isPendingLogin = (db: AppDbOrTx, now: Date) =>
	and(
		gt(loginTable.expiresAt, now),
		lt(
			db.$count(loginAttemptTable, eq(loginAttemptTable.loginId, loginTable.id)),
			LOGIN_MAX_ATTEMPTS,
		),
		notExists(
			db
				.select({ id: loginAttemptTable.id })
				.from(loginAttemptTable)
				.where(
					and(
						eq(loginAttemptTable.loginId, loginTable.id), //
						eq(loginAttemptTable.success, true),
					),
				),
		),
	)!;

export const findPendingLoginByContact = (
	db: AppDbOrTx,
	{ contact, now }: { contact: LoginSelect['contact']; now: Date },
) =>
	db
		.select({ id: loginTable.id })
		.from(loginTable)
		.where(
			and(
				eq(loginTable.contact, contact), //
				isPendingLogin(db, now),
			),
		)
		.get();

export const findPendingLoginById = (
	db: AppDbOrTx,
	{ loginId, now }: { loginId: LoginSelect['id']; now: Date },
) =>
	db
		.select({
			codeHash: loginTable.codeHash,
			contact: loginTable.contact,
			userId: loginTable.userId,
		})
		.from(loginTable)
		.where(
			and(
				eq(loginTable.id, loginId), //
				isPendingLogin(db, now),
			),
		)
		.get();

export const findLoginAttempt = (
	db: AppDbOrTx,
	{ loginId }: { loginId: LoginAttemptSelect['loginId'] },
) =>
	db
		.select({ id: loginAttemptTable.id })
		.from(loginAttemptTable)
		.where(eq(loginAttemptTable.loginId, loginId))
		.get();

export const createLogin = (
	tx: AppTx,
	{
		codeHash,
		contact,
		createdAt,
		expiresAt,
		ip,
		userId,
	}: {
		codeHash: LoginSelect['codeHash'];
		contact: LoginSelect['contact'];
		createdAt: LoginSelect['createdAt'];
		expiresAt: LoginSelect['expiresAt'];
		ip: LoginSelect['ip'];
		userId: LoginSelect['userId'];
	},
) =>
	tx
		.insert(loginTable)
		.values({ codeHash, contact, createdAt, expiresAt, ip, userId })
		.returning({ id: loginTable.id })
		.get().id;

export const markUnsentLoginSent = (
	tx: AppTx,
	{ loginId, sendId }: { loginId: LoginSelect['id']; sendId: NonNullable<LoginSelect['sendId']> },
) =>
	tx
		.update(loginTable)
		.set({ sendId })
		.where(
			and(
				eq(loginTable.id, loginId), //
				isNull(loginTable.sendId),
			),
		)
		.run();

export const linkLoginToUser = (
	tx: AppTx,
	{ loginId, userId }: { loginId: LoginSelect['id']; userId: NonNullable<LoginSelect['userId']> },
) =>
	tx
		.update(loginTable)
		.set({ userId })
		.where(
			and(
				eq(loginTable.id, loginId), //
				isNull(loginTable.userId),
			),
		)
		.run();

export const createLoginAttempt = (
	tx: AppTx,
	{
		attemptedAt,
		ip,
		loginId,
		success,
	}: {
		attemptedAt: LoginAttemptSelect['attemptedAt'];
		ip: LoginAttemptSelect['ip'];
		loginId: LoginAttemptSelect['loginId'];
		success: LoginAttemptSelect['success'];
	},
) => tx.insert(loginAttemptTable).values({ attemptedAt, ip, loginId, success }).run();

// Attempts first, then logins, see specs/05-database.md
const deleteLoginsWhere = (tx: AppTx, where: SQL) => {
	const loginIds = tx.select({ id: loginTable.id }).from(loginTable).where(where);
	tx.delete(loginAttemptTable).where(inArray(loginAttemptTable.loginId, loginIds)).run();
	return Number(tx.delete(loginTable).where(where).run().changes);
};

export const deleteLogin = (tx: AppTx, { loginId }: { loginId: LoginSelect['id'] }) =>
	deleteLoginsWhere(tx, eq(loginTable.id, loginId));

export const deleteUserLogins = (
	tx: AppTx,
	{
		contact,
		userId,
	}: {
		contact: LoginSelect['contact'];
		userId: NonNullable<LoginSelect['userId']>;
	},
) =>
	deleteLoginsWhere(
		tx,
		or(
			eq(loginTable.userId, userId),
			eq(loginTable.contact, contact), // logins before sign-up
		)!,
	);
