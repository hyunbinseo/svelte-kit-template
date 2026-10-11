import { defineQueries } from '#database/app/client.ts';
import { userProfileTable } from '#database/app/schema.ts';

export const db = defineQueries((db) => ({
	insertProfile: ({ id, birth }: Pick<typeof userProfileTable.$inferInsert, 'id' | 'birth'>) => {
		db.insert(userProfileTable).values({ id, birth }).onConflictDoNothing().run();
	},
}));
