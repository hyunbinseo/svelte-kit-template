import { gt } from 'drizzle-orm';
import type { TokenRevokeReason } from '#auth/enums.ts';
import { db, silentDb } from '#database/client.ts';
import { tokenBanTable, tokenTable } from '#database/schema.ts';

export const insertToken = (
	data: Pick<typeof tokenTable.$inferInsert, 'userId' | 'refreshedFrom' | 'refreshReason' | 'ip'>,
) =>
	db
		.insert(tokenTable)
		.values(data)
		.onConflictDoUpdate({ target: tokenTable.refreshedFrom, set: { userId: tokenTable.userId } })
		.returning({
			id: tokenTable.id,
			issuedAt: tokenTable.issuedAt,
			expiresAt: tokenTable.expiresAt,
		})
		.all()[0]!;

export const claimTokenRotation = ({
	tokenId,
	userId,
	ip,
	effectiveAt,
}: {
	tokenId: string;
	userId: string;
	ip: string;
	effectiveAt: Date;
}) => {
	const claimed = db
		.insert(tokenBanTable)
		.values({ tokenId, reason: 'rotate', effectiveAt, bannedBy: userId, ip })
		.onConflictDoNothing()
		.returning({ tokenId: tokenBanTable.tokenId })
		.all();

	return claimed.length > 0;
};

export const findActiveUser = (id: string) =>
	db.query.userTable
		.findFirst({
			where: { id, deactivatedAt: { isNull: true } },
			columns: { id: true },
			with: { profile: { columns: { id: true } }, activeRoles: { columns: { role: true } } },
		})
		.sync();

export const findTokenBan = (tokenId: string) =>
	silentDb.query.tokenBanTable
		.findFirst({
			where: { tokenId },
			columns: { reason: true, effectiveAt: true },
		})
		.sync();

export const revokeToken = ({
	tokenId,
	userId,
	reason,
	ip,
	bannedAt,
}: {
	tokenId: string;
	userId: string;
	reason: TokenRevokeReason;
	ip: string;
	bannedAt: Date;
}) => {
	const values = { reason, effectiveAt: bannedAt, bannedAt, bannedBy: userId, ip };
	db.insert(tokenBanTable)
		.values({ tokenId, ...values })
		.onConflictDoUpdate({
			target: tokenBanTable.tokenId,
			set: values,
			setWhere: gt(tokenBanTable.effectiveAt, bannedAt),
		})
		.run();
};
