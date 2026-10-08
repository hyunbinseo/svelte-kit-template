import { userProfileTable } from '#database/schema.ts';
import { pick } from '#lib/pick.ts';
import type { Database } from '../../../app.d.ts';

export const insertProfile = (
	db: Database,
	data: Pick<typeof userProfileTable.$inferInsert, 'id' | 'birth'>,
) => {
	db.insert(userProfileTable)
		.values(pick(data, ['id', 'birth']))
		.onConflictDoNothing()
		.run();
};
