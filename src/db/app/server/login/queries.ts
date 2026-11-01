import { eq, inArray, or, type SQL } from 'drizzle-orm';
import type { AppTx } from '#db/app/server/database.ts';
import { loginAttemptTable, type LoginSelect, loginTable } from '#db/app/server/schema.ts';

// Attempts first, then logins, see specs/05-database.md
const deleteLoginsWhere = (tx: AppTx, where: SQL) => {
	const loginIds = tx.select({ id: loginTable.id }).from(loginTable).where(where);
	tx.delete(loginAttemptTable).where(inArray(loginAttemptTable.loginId, loginIds)).run();
	return Number(tx.delete(loginTable).where(where).run().changes);
};

export const deleteUserLogins = (
	tx: AppTx,
	{
		contact,
		userId,
	}: {
		contact: LoginSelect['contact'];
		userId: NonNullable<LoginSelect['userId']>;
	},
) =>
	deleteLoginsWhere(
		tx,
		or(
			eq(loginTable.userId, userId),
			eq(loginTable.contact, contact), // logins before sign-up
		)!,
	);
