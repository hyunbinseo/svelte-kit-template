import { and, eq, isNull } from 'drizzle-orm';
import type { TokenBanReason, TokenRevokeReason } from '#auth/enums.ts';
import type { UserRole } from '#lib/enums/user.ts';
import { tokenBanTable, userRoleTable, userTable } from './schema.ts';
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
	const tokens = tx.query.tokenTable
		.findMany({
			where: { userId, expiresAt: { gt: ban.at } },
			columns: { id: true, expiresAt: true },
		})
		.sync();

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

export const grantUserRole = (
	db: AppDb,
	userId: string,
	grant: { role: UserRole; assignedBy: string },
) =>
	db.transaction(
		(tx) => {
			const user = tx.query.userTable
				.findFirst({
					where: { id: userId, deactivatedAt: { isNull: true } },
					columns: { id: true },
					with: { activeRoles: { where: { role: grant.role }, columns: { id: true } } },
				})
				.sync();

			if (!user || user.activeRoles.length) return undefined;

			return tx
				.insert(userRoleTable)
				.values({ userId, role: grant.role, assignedBy: grant.assignedBy })
				.returning({ id: userRoleTable.id })
				.all()[0]!.id;
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

const getLiveTokenFamily = (tx: AppTx, tokenId: string, userId: string, at: Date) => {
	const tokens = tx.query.tokenTable
		.findMany({
			where: { userId, expiresAt: { gt: at } },
			columns: { id: true, refreshedFrom: true },
			with: { bans: { where: { effectiveAt: { lte: at } }, columns: { id: true } } },
		})
		.sync();

	const byId = new Map(tokens.map((token) => [token.id, token]));
	const byParentId = new Map(tokens.map((token) => [token.refreshedFrom, token]));

	const family = [];

	for (
		let token = byId.get(tokenId);
		token;
		token = token.refreshedFrom ? byId.get(token.refreshedFrom) : undefined
	) {
		family.push(token);
	}

	for (let token = byParentId.get(tokenId); token; token = byParentId.get(token.id)) {
		family.push(token);
	}

	return family.filter((token) => !token.bans.length).map((token) => token.id);
};

export const revokeToken = (
	db: AppDb,
	tokenId: string,
	ban: { reason: TokenRevokeReason; bannedBy: string; ip: string },
) =>
	db.transaction(
		(tx) => {
			const at = new Date();

			const token = tx.query.tokenTable
				.findFirst({
					where: { id: tokenId },
					columns: { userId: true },
					with: {
						bans: {
							where: { effectiveAt: { lte: at }, reason: { ne: 'rotate' } },
							columns: { id: true },
						},
					},
				})
				.sync();

			if (!token || token.bans.length) return false;

			const ids = getLiveTokenFamily(tx, tokenId, token.userId, at);

			if (!ids.length) return false;

			tx.insert(tokenBanTable)
				.values(
					ids.map((id) => ({
						tokenId: id,
						reason: ban.reason,
						effectiveAt: at,
						bannedAt: at,
						bannedBy: ban.bannedBy,
						ip: ban.ip,
					})),
				)
				.run();

			return true;
		},
		{ behavior: 'immediate' },
	);
