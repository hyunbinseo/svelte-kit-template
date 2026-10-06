import { gt } from 'drizzle-orm';
import { tokenBanTable, tokenTable } from '#database/schema.ts';
import { AUTH_TOKEN_ROTATE_GRACE } from '#lib/auth/config.ts';
import type { TokenRefreshReason, TokenRevokeReason } from '#lib/enums/token.ts';
import type { Executor } from '#server/infrastructure/database.ts';

export type NewToken = {
	userId: string;
	refreshedFrom?: string | undefined;
	refreshReason?: TokenRefreshReason | undefined;
	ip: string;
};

export class TokenRepository {
	static readonly inject = ['executor', 'silentExecutor'] as const;

	constructor(
		private readonly db: Executor,
		private readonly silentDb: Executor,
	) {}

	insert(token: NewToken) {
		return (
			this.db
				.insert(tokenTable)
				.values(token)
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
				.all()[0]!
		);
	}

	// Returns `false` if another request already claimed the rotation.
	claimRotation(tokenId: string, userId: string, ip: string) {
		return (
			this.db
				.insert(tokenBanTable)
				.values({
					tokenId,
					reason: 'rotate',
					effectiveAt: new Date(Date.now() + AUTH_TOKEN_ROTATE_GRACE),
					bannedBy: userId,
					ip,
				})
				.onConflictDoNothing()
				.returning({ tokenId: tokenBanTable.tokenId })
				.all().length > 0
		);
	}

	revoke(tokenId: string, reason: TokenRevokeReason, bannedBy: string, ip: string) {
		const bannedAt = new Date();
		const ban = { reason, effectiveAt: bannedAt, bannedAt, bannedBy, ip };

		this.db
			.insert(tokenBanTable)
			.values({ tokenId, ...ban })
			.onConflictDoUpdate({
				target: tokenBanTable.tokenId,
				set: ban,
				setWhere: gt(tokenBanTable.effectiveAt, bannedAt),
			})
			.run();
	}

	findBan(tokenId: string) {
		return this.silentDb.query.tokenBanTable
			.findFirst({
				where: { tokenId },
				columns: { reason: true, effectiveAt: true },
			})
			.sync();
	}
}
