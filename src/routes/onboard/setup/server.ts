import { db } from '#database/client.ts';
import { userProfileTable } from '#database/schema.ts';

export const insertProfile = (data: typeof userProfileTable.$inferInsert) => {
	db.insert(userProfileTable).values(data).onConflictDoNothing().run();
};
