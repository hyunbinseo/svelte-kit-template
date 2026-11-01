import { and, eq, lt, or } from 'drizzle-orm';
import type { AuditTx } from '#db/audit/server/database.ts';
import { type EntrySelect, entryTable } from '#db/audit/server/schema.ts';

export const deleteExpiredEntries = (
	tx: AuditTx,
	{
		otherLoggedBefore,
		staffLoggedBefore,
	}: {
		otherLoggedBefore: EntrySelect['loggedAt'];
		staffLoggedBefore: EntrySelect['loggedAt'];
	},
) =>
	Number(
		tx
			.delete(entryTable)
			.where(
				or(
					and(eq(entryTable.byStaff, true), lt(entryTable.loggedAt, staffLoggedBefore)),
					and(eq(entryTable.byStaff, false), lt(entryTable.loggedAt, otherLoggedBefore)),
				),
			)
			.run().changes,
	);
