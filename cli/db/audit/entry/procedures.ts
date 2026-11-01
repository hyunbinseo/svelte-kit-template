import { deleteExpiredEntries } from '#cli/db/audit/entry/queries.ts';
import type { AuditDb } from '#db/audit/server/database.ts';

// Retention: see specs/07-audit-logging.md
export const purgeEntries = (db: AuditDb) =>
	db.transaction(
		(tx) => {
			// Calendar math, so 3 months before May 31 is Feb 28
			const now = Temporal.Now.zonedDateTimeISO('UTC');

			return deleteExpiredEntries(tx, {
				otherLoggedBefore: new Date(now.subtract({ months: 3 }).epochMilliseconds),
				staffLoggedBefore: new Date(now.subtract({ years: 2 }).epochMilliseconds),
			});
		},
		{ behavior: 'immediate' },
	);
