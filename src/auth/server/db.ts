import { defineQueries } from '#database/app/client.ts';
import { tokenBanTable } from '#database/app/schema.ts';
import { picked } from '#database/pick.ts';
import { authQueries } from './queries.ts';

export const db = defineQueries((db) => ({
	...authQueries(db),

	claimTokenRotation: picked<typeof tokenBanTable.$inferInsert>()(
		['tokenId', 'bannedBy', 'ip', 'effectiveAt'],
		(data) => {
			db.insert(tokenBanTable)
				.values({ ...data, reason: 'rotate' })
				.onConflictDoNothing()
				.run();
		},
	),

	findTokenBans: (id: string) =>
		db.query.tokenTable
			.findFirst({
				where: { id },
				columns: { id: true },
				with: { bans: { columns: { reason: true, effectiveAt: true } } },
			})
			.sync(),
}));
