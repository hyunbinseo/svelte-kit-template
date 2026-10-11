import { defineQueries } from '#database/app/client.ts';
import { userProfileTable } from '#database/app/schema.ts';
import type { AppInsert } from '#database/app/types.ts';

export const db = defineQueries((db) => ({
	claimProfile: ({ id, birth }: AppInsert<'userProfileTable', 'id' | 'birth'>) => {
		db.insert(userProfileTable).values({ id, birth }).onConflictDoNothing().run();
	},
}));
