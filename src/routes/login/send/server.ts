import { eq } from 'drizzle-orm';
import { defineQueries } from '#database/app/client.ts';
import { verificationTable } from '#database/app/schema.ts';

export const db = defineQueries((db) => ({
	findUserByContact: (contact: string) =>
		db.query.userTable.findFirst({ where: { contact }, columns: { id: true } }).sync(),

	findVerificationByIdentifier: (identifier: string) =>
		db.query.verificationTable
			.findFirst({ where: { identifier }, columns: { expiresAt: true } })
			.sync(),

	discardVerification: (identifier: string) => {
		db.delete(verificationTable).where(eq(verificationTable.identifier, identifier)).run();
	},
}));
