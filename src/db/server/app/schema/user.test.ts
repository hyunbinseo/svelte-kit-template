import assert from 'node:assert/strict';
import { eq } from 'drizzle-orm';
import { describe, test } from 'vite-plus/test';
import { createAppDb, seedUser, seedUserRole } from '#tests/database/app.ts';
import { drizzleQueryErrorCausedBy, sqliteConstraintUniqueError } from '#tests/database/sqlite.ts';
import { deactivateUser, revokeUserRole } from '../cascades.ts';
import { userTable } from './user.ts';

const setup = () => {
	const db = createAppDb();
	return { db, adminId: seedUser(db).id, user: seedUser(db) };
};

describe('active_user_contact_idx', () => {
	test('blocks a duplicate contact among active users', () => {
		const { db, user } = setup();
		const other = seedUser(db);

		assert.throws(
			() =>
				db.update(userTable).set({ contact: user.contact }).where(eq(userTable.id, other.id)).run(),
			drizzleQueryErrorCausedBy(sqliteConstraintUniqueError),
		);
	});

	test('allows reusing the contact of a deactivated user', () => {
		const { db, adminId, user } = setup();
		const other = seedUser(db);

		deactivateUser(db, user.id, { deactivatedBy: adminId, ip: '' });

		db.update(userTable).set({ contact: user.contact }).where(eq(userTable.id, other.id)).run();
	});
});

describe('active_user_role_user_id_role_idx', () => {
	test('blocks a duplicate active role', () => {
		const { db, adminId, user } = setup();
		seedUserRole(db, user.id, adminId);

		assert.throws(
			() => seedUserRole(db, user.id, adminId),
			drizzleQueryErrorCausedBy(sqliteConstraintUniqueError),
		);
	});

	test('allows reassigning a revoked role', () => {
		const { db, adminId, user } = setup();
		const role = seedUserRole(db, user.id, adminId);

		revokeUserRole(db, role.id, { revokedBy: adminId, ip: '' });

		seedUserRole(db, user.id, adminId);
	});
});
