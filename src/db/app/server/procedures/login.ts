import { inArray, type SQL } from 'drizzle-orm';
import type { AppTx } from '#db/app/server/database.ts';
import { loginAttemptTable, loginTable } from '#db/app/server/schema.ts';

// Used by closing a user and the purge job, see specs/12-operations.md
export const deleteLogins = (tx: AppTx, where: SQL) => {
	const loginIds = tx.select({ id: loginTable.id }).from(loginTable).where(where);
	tx.delete(loginAttemptTable).where(inArray(loginAttemptTable.loginId, loginIds)).run();
	return Number(tx.delete(loginTable).where(where).run().changes);
};
