import { userProfileTable } from '#database/app/schema.ts';
import type { AppDbOrTx, AppInsert } from '#database/app/types.ts';

export const claimProfile =
	(db: AppDbOrTx) =>
	({ id, birth }: AppInsert<'userProfileTable', 'id' | 'birth'>) => {
		db.insert(userProfileTable).values({ id, birth }).onConflictDoNothing().run();
	};
