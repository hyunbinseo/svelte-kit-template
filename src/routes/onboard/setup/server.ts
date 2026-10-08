import { db as client } from '#database/client.ts';
import { userProfileTable } from '#database/schema.ts';
import { withTransactions } from '#database/transaction.ts';
import { pick } from '#lib/pick.ts';
import type { Database } from '../../../app.d.ts';

const insertProfile = (
	db: Database, //
	data: Pick<
		typeof userProfileTable.$inferInsert,
		| 'id' //
		| 'birth'
	>,
) => {
	db.insert(userProfileTable)
		.values(pick(data, ['id', 'birth']))
		.onConflictDoNothing()
		.run();
};

export const db = withTransactions(client, { insertProfile });
