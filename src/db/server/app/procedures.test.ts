import assert from 'node:assert/strict';
import { eq } from 'drizzle-orm';
import { afterEach, beforeEach, describe, test, vi } from 'vite-plus/test';
import { createAppDb, seedUser, seedUserRole, seedUserSession } from '#tests/database/app.ts';
import { deactivateUser, grantUserRole, revokeUserRole, revokeUserSession } from './procedures.ts';
import { userRoleTable, userSessionTable, userTable } from './schema.ts';
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
	revokeUserRole(db, roleId, { revokedBy });
	vi.setSystemTime(at);
};

const findUserSession = (db: AppDb, sessionId: string) =>
	db.select().from(userSessionTable).where(eq(userSessionTable.id, sessionId)).get();

const setup = () => {
	const db = createAppDb();
	return { db, adminId: seedUser(db).id, userId: seedUser(db).id };
};

describe('deactivateUser', () => {
	test('deactivates the user', () => {
		const { db, adminId, userId } = setup();

		assert.equal(deactivateUser(db, userId, { deactivatedBy: adminId }), true);

		const row = db.select().from(userTable).where(eq(userTable.id, userId)).get();
		assert.equal(row?.deactivatedAt?.getTime(), at.getTime());
		assert.equal(row?.deactivatedBy, adminId);
	});

	test('revokes active role (reason: deactivate)', () => {
		const { db, adminId, userId } = setup();
		seedUserRole(db, userId, adminId);

		deactivateUser(db, userId, { deactivatedBy: adminId });

		const role = db.select().from(userRoleTable).where(eq(userRoleTable.userId, userId)).get();
		assert.equal(role?.revokedAt?.getTime(), at.getTime());
		assert.equal(role?.revokedBy, adminId);
		assert.equal(role?.revokeReason, 'deactivate');
	});

	test('revokes active session (reason: deactivate)', () => {
		const { db, adminId, userId } = setup();
		const session = seedUserSession(db, userId, 999_999_000);

		deactivateUser(db, userId, { deactivatedBy: adminId });

		const after = findUserSession(db, session.id);
		assert.equal(after?.revokedAt?.getTime(), at.getTime());
		assert.equal(after?.revokedBy, adminId);
		assert.equal(after?.revokeReason, 'deactivate');
	});

	test('does not overwrite already revoked role', () => {
		const { db, adminId, userId } = setup();
		const role = seedUserRole(db, userId, adminId);
		revokeEarlier(db, role.id, adminId);

		deactivateUser(db, userId, { deactivatedBy: adminId });

		const after = db.select().from(userRoleTable).where(eq(userRoleTable.id, role.id)).get();
		assert.equal(after?.revokedAt?.getTime(), 50_000);
		assert.equal(after?.revokeReason, 'manual');
	});

	test('does not overwrite already revoked session', () => {
		const { db, adminId, userId } = setup();
		const session = seedUserSession(db, userId, 999_999_000);
		vi.setSystemTime(50_000);
		revokeUserSession(db, session.id, { revokedBy: userId, reason: 'logout' });
		vi.setSystemTime(at);

		deactivateUser(db, userId, { deactivatedBy: adminId });

		const after = findUserSession(db, session.id);
		assert.equal(after?.revokedAt?.getTime(), 50_000);
		assert.equal(after?.revokeReason, 'logout');
	});

	test('does nothing if already deactivated', () => {
		const { db, adminId, userId } = setup();
		deactivateUser(db, userId, { deactivatedBy: adminId });

		// Added after the first deactivation, so a repeat would revoke them.
		const role = seedUserRole(db, userId, adminId);
		const session = seedUserSession(db, userId, 999_999_000);

		assert.equal(deactivateUser(db, userId, { deactivatedBy: adminId }), false);

		const after = db.select().from(userRoleTable).where(eq(userRoleTable.id, role.id)).get();
		assert.equal(after?.revokedAt, null);
		assert.equal(findUserSession(db, session.id)?.revokedAt, null);
	});
});

describe('grantUserRole', () => {
	test('grants the role', () => {
		const { db, adminId, userId } = setup();

		const roleId = grantUserRole(db, userId, { role: 'admin', assignedBy: adminId });

		assert(roleId);
		const role = db.select().from(userRoleTable).where(eq(userRoleTable.id, roleId)).get();
		assert.equal(role?.userId, userId);
		assert.equal(role?.role, 'admin');
		assert.equal(role?.assignedBy, adminId);
	});

	test('grants again after revocation', () => {
		const { db, adminId, userId } = setup();
		const role = seedUserRole(db, userId, adminId);
		revokeEarlier(db, role.id, adminId);

		assert(grantUserRole(db, userId, { role: 'admin', assignedBy: adminId }));
	});

	test('does nothing if the role is already active', () => {
		const { db, adminId, userId } = setup();
		seedUserRole(db, userId, adminId);

		assert.equal(grantUserRole(db, userId, { role: 'admin', assignedBy: adminId }), undefined);

		const roles = db.select().from(userRoleTable).where(eq(userRoleTable.userId, userId)).all();
		assert.equal(roles.length, 1);
	});

	test('does nothing if the user is deactivated', () => {
		const { db, adminId, userId } = setup();
		deactivateUser(db, userId, { deactivatedBy: adminId });

		assert.equal(grantUserRole(db, userId, { role: 'admin', assignedBy: adminId }), undefined);

		const roles = db.select().from(userRoleTable).where(eq(userRoleTable.userId, userId)).all();
		assert.deepEqual(roles, []);
	});
});

describe('revokeUserRole', () => {
	test('revokes the role (reason: manual)', () => {
		const { db, adminId, userId } = setup();
		const role = seedUserRole(db, userId, adminId);

		assert.equal(revokeUserRole(db, role.id, { revokedBy: adminId }), true);

		const after = db.select().from(userRoleTable).where(eq(userRoleTable.id, role.id)).get();
		assert.equal(after?.revokedAt?.getTime(), at.getTime());
		assert.equal(after?.revokeReason, 'manual');
	});

	test('does nothing if already revoked', () => {
		const { db, adminId, userId } = setup();
		const role = seedUserRole(db, userId, adminId);
		revokeEarlier(db, role.id, adminId);

		assert.equal(revokeUserRole(db, role.id, { revokedBy: adminId }), false);

		const after = db.select().from(userRoleTable).where(eq(userRoleTable.id, role.id)).get();
		assert.equal(after?.revokedAt?.getTime(), 50_000);
	});
});

describe('revokeUserSession', () => {
	test('revokes the session (reason: logout)', () => {
		const { db, userId } = setup();
		const session = seedUserSession(db, userId, 999_999_000);
		const other = seedUserSession(db, userId, 999_999_000);

		assert.equal(revokeUserSession(db, session.id, { revokedBy: userId, reason: 'logout' }), true);

		const after = findUserSession(db, session.id);
		assert.equal(after?.revokedAt?.getTime(), at.getTime());
		assert.equal(after?.revokedBy, userId);
		assert.equal(after?.revokeReason, 'logout');
		assert.equal(findUserSession(db, other.id)?.revokedAt, null);
	});

	test('does nothing if already revoked', () => {
		const { db, adminId, userId } = setup();
		const session = seedUserSession(db, userId, 999_999_000);
		deactivateUser(db, userId, { deactivatedBy: adminId });

		assert.equal(revokeUserSession(db, session.id, { revokedBy: userId, reason: 'logout' }), false);

		assert.equal(findUserSession(db, session.id)?.revokeReason, 'deactivate');
	});

	test('does nothing if the session does not exist', () => {
		const { db, userId } = setup();

		assert.equal(revokeUserSession(db, 'missing', { revokedBy: userId, reason: 'logout' }), false);
	});
});
