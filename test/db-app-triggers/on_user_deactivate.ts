import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { eq } from 'drizzle-orm';
import { banFor, createDb, seedRole, seedToken, seedUser } from '#cli/lib/database/app.memory.ts';
import { tokenBanTable, userRoleTable, userTable } from '#lib/database/schema.ts';

describe('user.deactivated_at set', () => {
	describe('direct effect', () => {
		test('revokes active user_role (reason: deactivate)', () => {
			const db = createDb();
			const admin = seedUser(db);
			const user = seedUser(db);
			db.insert(userRoleTable).values({ userId: user, role: 'admin', assignedBy: admin }).run();

			db.update(userTable)
				.set({ deactivatedAt: new Date(100_000), deactivatedBy: admin })
				.where(eq(userTable.id, user))
				.run();

			const role = db.select().from(userRoleTable).where(eq(userRoleTable.userId, user)).get();
			assert.equal(role?.revokedAt?.getTime(), 100_000);
			assert.equal(role?.revokedBy, admin);
			assert.equal(role?.revokeReason, 'deactivate');
		});

		test('bans live token immediately (reason: deactivate)', () => {
			const db = createDb();
			const admin = seedUser(db);
			const user = seedUser(db);
			const token = seedToken(db, user, 999_999_000);

			db.update(userTable)
				.set({ deactivatedAt: new Date(100_000), deactivatedBy: admin })
				.where(eq(userTable.id, user))
				.run();

			const ban = banFor(db, token);
			assert.equal(ban?.reason, 'deactivate');
			assert.equal(ban?.effectiveAt.getTime(), 100_000); // immediate, not deferred to expiry
		});
	});

	describe('guards', () => {
		test('does not overwrite already revoked user_role', () => {
			const db = createDb();
			const admin = seedUser(db);
			const user = seedUser(db);
			const role = db
				.insert(userRoleTable)
				.values({ userId: user, role: 'admin', assignedBy: admin })
				.returning()
				.all()[0]!;
			db.update(userRoleTable)
				.set({ revokedAt: new Date(50_000), revokedBy: admin, revokeReason: 'manual' })
				.where(eq(userRoleTable.id, role.id))
				.run();

			db.update(userTable)
				.set({ deactivatedAt: new Date(100_000), deactivatedBy: admin })
				.where(eq(userTable.id, user))
				.run();

			const after = db.select().from(userRoleTable).where(eq(userRoleTable.id, role.id)).get();
			assert.equal(after?.revokedAt?.getTime(), 50_000);
			assert.equal(after?.revokeReason, 'manual');
		});

		test('does not ban already expired token', () => {
			const db = createDb();
			const admin = seedUser(db);
			const user = seedUser(db);
			const token = seedToken(db, user, 50_000);

			db.update(userTable)
				.set({ deactivatedAt: new Date(100_000), deactivatedBy: admin })
				.where(eq(userTable.id, user))
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

			db.update(userTable)
				.set({ deactivatedAt: new Date(100_000), deactivatedBy: admin })
				.where(eq(userTable.id, user))
				.run();

			assert.equal(banFor(db, token)?.reason, 'logout');
		});
	});

	describe('transition guard', () => {
		test('does not re-fire cascade on repeat deactivated_at update', () => {
			const db = createDb();
			const admin = seedUser(db);
			const user = seedUser(db);

			db.update(userTable)
				.set({ deactivatedAt: new Date(100_000), deactivatedBy: admin })
				.where(eq(userTable.id, user))
				.run();

			// Added after the first deactivation, so a re-fire would revoke/ban them.
			const role = seedRole(db, user, admin);
			const token = seedToken(db, user, 999_999_000);

			db.update(userTable)
				.set({ deactivatedAt: new Date(200_000), deactivatedBy: admin })
				.where(eq(userTable.id, user))
				.run();

			const after = db.select().from(userRoleTable).where(eq(userRoleTable.id, role.id)).get();
			assert.equal(after?.revokedAt, null);
			assert.equal(banFor(db, token), undefined);
		});
	});
});
