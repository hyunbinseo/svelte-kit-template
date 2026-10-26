import { eq } from 'drizzle-orm';
import { beforeEach, expect, test } from 'vite-plus/test';
import type { AppDb } from '#db/app/server/database.ts';
import { deleteLogins } from '#db/app/server/procedures/login.ts';
import { loginAttemptTable, loginTable } from '#db/app/server/schema.ts';
import { createTestDatabase, seedLogin } from '#db/app/server/testing.ts';

let db: AppDb;

beforeEach(() => {
	db = createTestDatabase();
	for (const contact of ['a@example.com', 'a@example.com', 'b@example.com']) {
		seedLogin(db, { contact });
	}
	return () => db.$client.close();
});

test('deletes matching logins with their attempts', () => {
	const deletedCount = db.transaction(
		(tx) => deleteLogins(tx, eq(loginTable.contact, 'a@example.com')),
		{ behavior: 'immediate' },
	);

	expect(deletedCount).toBe(2);
	expect(db.select({ contact: loginTable.contact }).from(loginTable).all()).toEqual([
		{ contact: 'b@example.com' },
	]);
	expect(db.select({ loginId: loginAttemptTable.loginId }).from(loginAttemptTable).all()).toEqual([
		{ loginId: 3 },
	]);
});

test('returns 0 if no login matches', () => {
	const deletedCount = db.transaction(
		(tx) => deleteLogins(tx, eq(loginTable.contact, 'c@example.com')),
		{ behavior: 'immediate' },
	);

	expect(deletedCount).toBe(0);
});
