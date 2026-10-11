import { defineQueries } from '#database/app/client.ts';
import { userProfileTable } from '#database/app/schema.ts';
import { picked } from '#database/pick.ts';

export const db = defineQueries((db) => ({
	insertProfile: picked<typeof userProfileTable.$inferInsert>()(['id', 'birth'], (data) => {
		db.insert(userProfileTable).values(data).onConflictDoNothing().run();
	}),
}));
