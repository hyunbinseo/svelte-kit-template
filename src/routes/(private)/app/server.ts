import { db as client } from '#database/client.ts';
import type { userTable } from '#database/schema.ts';
import { withTransactions } from '#database/transaction.ts';
import type { Database } from '../../../app.d.ts';

const findCurrentUser = (
	db: Database, //
	id: typeof userTable.$inferSelect.id,
) =>
	db.query.userTable
		.findFirst({
			where: { id, deactivatedAt: { isNull: true } },
			columns: { id: true, contact: true },
			with: { profile: { columns: { birth: true } } },
		})
		.sync();

export const db = withTransactions(client, { findCurrentUser });
