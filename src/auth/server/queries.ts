import { tokenBanTable, tokenTable } from '#database/app/schema.ts';
import type { AppDbOrTx, AppInsert } from '#database/app/types.ts';

export const findActiveUserById = (db: AppDbOrTx) => (id: string) =>
	db.query.userTable
		.findFirst({
			where: { id, deactivatedAt: { isNull: true } },
			columns: { id: true },
			with: { profile: { columns: { id: true } }, activeRoles: { columns: { role: true } } },
		})
		.sync();

export const createOrFindToken =
	(db: AppDbOrTx) =>
	({
		userId,
		refreshedFrom,
		refreshReason,
		ip,
	}: AppInsert<'tokenTable', 'userId' | 'refreshedFrom' | 'refreshReason' | 'ip'>) =>
		db
			.insert(tokenTable)
			.values({ userId, refreshedFrom, refreshReason, ip })
			// Returns existing row.
			.onConflictDoUpdate({
				target: tokenTable.refreshedFrom,
				set: { userId: tokenTable.userId },
			})
			.returning({
				id: tokenTable.id,
				issuedAt: tokenTable.issuedAt,
				expiresAt: tokenTable.expiresAt,
			})
			.all()[0]!;

export const claimTokenRotation =
	(db: AppDbOrTx) =>
	({
		tokenId,
		bannedBy,
		ip,
		effectiveAt,
	}: AppInsert<'tokenBanTable', 'tokenId' | 'bannedBy' | 'ip' | 'effectiveAt'>) => {
		db.insert(tokenBanTable)
			.values({ tokenId, bannedBy, ip, effectiveAt, reason: 'rotate' })
			.onConflictDoNothing()
			.run();
	};

export const findTokenWithBans = (db: AppDbOrTx) => (id: string) =>
	db.query.tokenTable
		.findFirst({
			where: { id },
			columns: { id: true, issuedAt: true, expiresAt: true },
			with: { bans: { columns: { reason: true, effectiveAt: true } } },
		})
		.sync();

export const findLiveTokensByUserId = (db: AppDbOrTx) => (userId: string) =>
	db.query.tokenTable
		.findMany({
			where: { userId, expiresAt: { gt: new Date() } },
			columns: { id: true, refreshedFrom: true, issuedAt: true, expiresAt: true },
			with: { bans: { columns: { reason: true, effectiveAt: true } } },
		})
		.sync();
