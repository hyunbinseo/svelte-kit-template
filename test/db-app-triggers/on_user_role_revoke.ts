import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { eq } from 'drizzle-orm';
import { banFor, createDb, seedRole, seedToken, seedUser } from '#cli/lib/database/app.memory.ts';
import { tokenBanTable, userRoleTable } from '#lib/database/schema.ts';

describe('user_role.revoked_at set', () => {
	describe('direct effect', () => {
		test('defers token ban until expiry (reason: stale)', () => {
			const db = createDb();
			const admin = seedUser(db);
			const user = seedUser(db);
			const token = seedToken(db, user, 999_999_000);
			const role = seedRole(db, user, admin);

			db.update(userRoleTable)
				.set({ revokedAt: new Date(100_000), revokedBy: admin, revokeReason: 'manual' })
				.where(eq(userRoleTable.id, role.id))
				.run();

			const ban = banFor(db, token);
			assert.equal(ban?.reason, 'stale');
			assert.equal(ban?.effectiveAt.getTime(), 999_999_000); // deferred, not immediate
		});
	});

	describe('guards', () => {
		test('does not ban already expired token', () => {
			const db = createDb();
			const admin = seedUser(db);
			const user = seedUser(db);
			const token = seedToken(db, user, 50_000);
			const role = seedRole(db, user, admin);

			db.update(userRoleTable)
				.set({ revokedAt: new Date(100_000), revokedBy: admin, revokeReason: 'manual' })
				.where(eq(userRoleTable.id, role.id))
				.run();

			assert.equal(banFor(db, token), undefined);
		});

		test('does not double-ban already banned token', () => {
			const db = createDb();
			const admin = seedUser(db);
			const user = seedUser(db);
			const token = seedToken(db, user, 999_999_000);
			db.insert(tokenBanTable)
				.values({
					tokenId: token,
					reason: 'logout',
					effectiveAt: new Date(1_000),
					bannedBy: user,
					ip: '',
				})
				.run();
			const role = seedRole(db, user, admin);

			db.update(userRoleTable)
				.set({ revokedAt: new Date(100_000), revokedBy: admin, revokeReason: 'manual' })
				.where(eq(userRoleTable.id, role.id))
				.run();

			assert.equal(banFor(db, token)?.reason, 'logout');
		});
	});

	describe('transition guard', () => {
		test('does not re-fire cascade on repeat revoked_at update', () => {
			const db = createDb();
			const admin = seedUser(db);
			const user = seedUser(db);
			const role = seedRole(db, user, admin);

			db.update(userRoleTable)
				.set({ revokedAt: new Date(100_000), revokedBy: admin, revokeReason: 'manual' })
				.where(eq(userRoleTable.id, role.id))
				.run();

			// Added after the first revoke, so a re-fire would defer-ban it.
			const token = seedToken(db, user, 999_999_000);

			db.update(userRoleTable)
				.set({ revokedAt: new Date(200_000), revokedBy: admin, revokeReason: 'manual' })
				.where(eq(userRoleTable.id, role.id))
				.run();

			assert.equal(banFor(db, token), undefined);
		});
	});

	describe('cross-trigger state', () => {
		test('does not ban when revoke_reason is set to deactivate directly', () => {
			const db = createDb();
			const admin = seedUser(db);
			const user = seedUser(db);
			const token = seedToken(db, user, 999_999_000);
			const role = seedRole(db, user, admin);

			// Bypasses on_user_deactivate entirely, to test this trigger's own guard in isolation.
			db.update(userRoleTable)
				.set({ revokedAt: new Date(100_000), revokedBy: admin, revokeReason: 'deactivate' })
				.where(eq(userRoleTable.id, role.id))
				.run();

			assert.equal(banFor(db, token), undefined);
		});
	});
});
