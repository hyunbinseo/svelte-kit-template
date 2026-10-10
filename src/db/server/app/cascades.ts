import { and, eq, gt, isNull } from 'drizzle-orm';
import type { TokenBanReason } from '#auth/enums.ts';
import { tokenBanTable, tokenTable, userRoleTable, userTable } from './schema.ts';
import type { AppDb, AppTx } from './types.ts';

const banLiveTokens = (
	tx: AppTx,
	userId: string,
	ban: {
		reason: Extract<TokenBanReason, 'deactivate' | 'stale'>;
		at: Date;
		bannedBy: string;
		ip: string;
	},
) => {
	const tokens = tx
		.select({ id: tokenTable.id, expiresAt: tokenTable.expiresAt })
		.from(tokenTable)
		.where(and(eq(tokenTable.userId, userId), gt(tokenTable.expiresAt, ban.at)))
		.all();

	if (!tokens.length) return;

	tx.insert(tokenBanTable)
		.values(
			tokens.map((token) => ({
				tokenId: token.id,
				reason: ban.reason,
				// Deactivation bans immediately; a stale token is banned once it expires.
				effectiveAt: ban.reason === 'deactivate' ? ban.at : token.expiresAt,
				bannedAt: ban.at,
				bannedBy: ban.bannedBy,
				ip: ban.ip,
			})),
		)
		.run();
};

export const deactivateUser = (
	db: AppDb,
	userId: string,
	deactivation: { deactivatedBy: string; ip: string },
) =>
	db.transaction(
		(tx) => {
			const at = new Date();

			const user = tx
				.update(userTable)
				.set({ deactivatedAt: at, deactivatedBy: deactivation.deactivatedBy })
				.where(and(eq(userTable.id, userId), isNull(userTable.deactivatedAt)))
				.returning({ id: userTable.id })
				.all()[0];

			if (!user) return false;

			tx.update(userRoleTable)
				.set({ revokedAt: at, revokedBy: deactivation.deactivatedBy, revokeReason: 'deactivate' })
				.where(and(eq(userRoleTable.userId, userId), isNull(userRoleTable.revokedAt)))
				.run();

			banLiveTokens(tx, userId, {
				reason: 'deactivate',
				at,
				bannedBy: deactivation.deactivatedBy,
				ip: deactivation.ip,
			});
			return true;
		},
		{ behavior: 'immediate' },
	);

export const revokeUserRole = (
	db: AppDb,
	roleId: string,
	revocation: { revokedBy: string; ip: string },
) =>
	db.transaction(
		(tx) => {
			const at = new Date();

			const role = tx
				.update(userRoleTable)
				.set({ revokedAt: at, revokedBy: revocation.revokedBy, revokeReason: 'manual' })
				.where(and(eq(userRoleTable.id, roleId), isNull(userRoleTable.revokedAt)))
				.returning({ userId: userRoleTable.userId })
				.all()[0];

			if (!role) return false;

			banLiveTokens(tx, role.userId, {
				reason: 'stale',
				at,
				bannedBy: revocation.revokedBy,
				ip: revocation.ip,
			});
			return true;
		},
		{ behavior: 'immediate' },
	);
