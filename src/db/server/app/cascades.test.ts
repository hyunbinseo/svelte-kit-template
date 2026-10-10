import assert from 'node:assert/strict';
import { eq } from 'drizzle-orm';
import { afterEach, beforeEach, describe, test, vi } from 'vite-plus/test';
import {
	createAppDb,
	findTokenBans,
	getSoleTokenBan,
	seedUserRole,
	seedToken,
	seedTokenBan,
	seedUser,
} from '#tests/database/app.ts';
import { deactivateUser, revokeUserRole } from './cascades.ts';
import { userRoleTable, userTable } from './schema.ts';
import type { AppDb } from './types.ts';

const at = new Date(100_000);

beforeEach(() => {
	vi.useFakeTimers({ toFake: ['Date'] });
	vi.setSystemTime(at);
});

afterEach(() => {
	vi.useRealTimers();
});

const revokeEarlier = (db: AppDb, roleId: string, revokedBy: string) => {
	vi.setSystemTime(50_000);
	revokeUserRole(db, roleId, { revokedBy: revokedBy, ip: '' });
	vi.setSystemTime(at);
};

const setup = () => {
	const db = createAppDb();
	return { db, adminId: seedUser(db).id, userId: seedUser(db).id };
};

describe('deactivateUser', () => {
	test('deactivates the user', () => {
		const { db, adminId, userId } = setup();

		assert.equal(deactivateUser(db, userId, { deactivatedBy: adminId, ip: '' }), true);

		const row = db.select().from(userTable).where(eq(userTable.id, userId)).get();
		assert.equal(row?.deactivatedAt?.getTime(), at.getTime());
		assert.equal(row?.deactivatedBy, adminId);
	});

	test('revokes active role (reason: deactivate)', () => {
		const { db, adminId, userId } = setup();
		seedUserRole(db, userId, adminId);

		deactivateUser(db, userId, { deactivatedBy: adminId, ip: '' });

		const role = db.select().from(userRoleTable).where(eq(userRoleTable.userId, userId)).get();
		assert.equal(role?.revokedAt?.getTime(), at.getTime());
		assert.equal(role?.revokedBy, adminId);
		assert.equal(role?.revokeReason, 'deactivate');
	});

	test('bans live token immediately (reason: deactivate)', () => {
		const { db, adminId, userId } = setup();
		const token = seedToken(db, userId, 999_999_000);

		deactivateUser(db, userId, { deactivatedBy: adminId, ip: '127.0.0.1' });

		const ban = getSoleTokenBan(db, token.id);
		assert.equal(ban.reason, 'deactivate');
		assert.equal(ban.effectiveAt.getTime(), at.getTime());
		assert.equal(ban.ip, '127.0.0.1');
	});

	test('does not overwrite already revoked role', () => {
		const { db, adminId, userId } = setup();
		const role = seedUserRole(db, userId, adminId);
		revokeEarlier(db, role.id, adminId);

		deactivateUser(db, userId, { deactivatedBy: adminId, ip: '' });

		const after = db.select().from(userRoleTable).where(eq(userRoleTable.id, role.id)).get();
		assert.equal(after?.revokedAt?.getTime(), 50_000);
		assert.equal(after?.revokeReason, 'manual');
	});

	test('does not ban already expired token', () => {
		const { db, adminId, userId } = setup();
		const token = seedToken(db, userId, 50_000);

		deactivateUser(db, userId, { deactivatedBy: adminId, ip: '' });

		assert.deepEqual(findTokenBans(db, token.id), []);
	});

	test('keeps an existing ban', () => {
		const { db, adminId, userId } = setup();
		const token = seedToken(db, userId, 999_999_000);
		seedTokenBan(db, token.id, userId, 'logout', 1_000);

		deactivateUser(db, userId, { deactivatedBy: adminId, ip: '' });

		assert.deepEqual(
			findTokenBans(db, token.id).map((ban) => ban.reason),
			['logout', 'deactivate'],
		);
	});

	test('adds an immediate ban before a deferred one', () => {
		const { db, adminId, userId } = setup();
		const token = seedToken(db, userId, 999_999_000);
		const role = seedUserRole(db, userId, adminId);
		revokeEarlier(db, role.id, adminId);

		deactivateUser(db, userId, { deactivatedBy: adminId, ip: '' });

		const bans = findTokenBans(db, token.id);
		assert.equal(bans.length, 2);
		const [first, second] = bans;
		assert.equal(first?.reason, 'deactivate');
		assert.equal(first?.effectiveAt.getTime(), at.getTime());
		assert.equal(second?.reason, 'stale');
		assert.equal(second?.bannedAt.getTime(), 50_000);
	});

	test('does nothing if already deactivated', () => {
		const { db, adminId, userId } = setup();
		deactivateUser(db, userId, { deactivatedBy: adminId, ip: '' });

		// Added after the first deactivation, so a repeat would revoke/ban them.
		const role = seedUserRole(db, userId, adminId);
		const token = seedToken(db, userId, 999_999_000);

		assert.equal(deactivateUser(db, userId, { deactivatedBy: adminId, ip: '' }), false);

		const after = db.select().from(userRoleTable).where(eq(userRoleTable.id, role.id)).get();
		assert.equal(after?.revokedAt, null);
		assert.deepEqual(findTokenBans(db, token.id), []);
	});
});

describe('revokeUserRole', () => {
	test('revokes the role (reason: manual)', () => {
		const { db, adminId, userId } = setup();
		const role = seedUserRole(db, userId, adminId);

		assert.equal(revokeUserRole(db, role.id, { revokedBy: adminId, ip: '' }), true);

		const after = db.select().from(userRoleTable).where(eq(userRoleTable.id, role.id)).get();
		assert.equal(after?.revokedAt?.getTime(), at.getTime());
		assert.equal(after?.revokeReason, 'manual');
	});

	test('defers token ban until expiry (reason: stale)', () => {
		const { db, adminId, userId } = setup();
		const token = seedToken(db, userId, 999_999_000);
		const role = seedUserRole(db, userId, adminId);

		revokeUserRole(db, role.id, { revokedBy: adminId, ip: '127.0.0.1' });

		const ban = getSoleTokenBan(db, token.id);
		assert.equal(ban.reason, 'stale');
		assert.equal(ban.effectiveAt.getTime(), 999_999_000);
		assert.equal(ban.ip, '127.0.0.1');
	});

	test('does nothing if already revoked', () => {
		const { db, adminId, userId } = setup();
		const role = seedUserRole(db, userId, adminId);
		revokeEarlier(db, role.id, adminId);
		const token = seedToken(db, userId, 999_999_000);

		assert.equal(revokeUserRole(db, role.id, { revokedBy: adminId, ip: '' }), false);

		assert.deepEqual(findTokenBans(db, token.id), []);
	});
});
