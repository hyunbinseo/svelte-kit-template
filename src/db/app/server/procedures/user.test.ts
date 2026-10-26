import { randomBytes } from 'node:crypto';
import { eq } from 'drizzle-orm';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vite-plus/test';
import type { AppDb } from '#db/app/server/database.ts';
import { closeUser, grantRole, revokeRole } from '#db/app/server/procedures/user.ts';
import {
	loginAttemptTable,
	loginTable,
	userProfileTable,
	type UserRoleInsert,
	userRoleTable,
	type UserSessionInsert,
	userSessionTable,
	userTable,
} from '#db/app/server/schema.ts';
import { createTestDatabase, seedLogin } from '#db/app/server/testing.ts';

const past = new Date('2026-01-01T00:00:00Z');
const now = new Date('2026-01-02T00:00:00Z');
const future = new Date('2026-01-03T00:00:00Z');

const ADMIN_ID = 1;
const MEMBER_ID = 2;
const CLOSED_ID = 3;
const MISSING_ID = 99;

const validUserRole = {
	assignedAt: past,
	role: 'admin',
	userId: MEMBER_ID,
} satisfies UserRoleInsert;

const validUserSession = {
	createdAt: past,
	expiresAt: future,
	ip: '::1',
	secretHash: randomBytes(32),
	userId: MEMBER_ID,
} satisfies UserSessionInsert;

let db: AppDb;

beforeEach(() => {
	vi.useFakeTimers({ now, toFake: ['Date'] });
	db = createTestDatabase();
	db.insert(userTable)
		.values([
			{ contact: 'admin@example.com', createdAt: past, id: ADMIN_ID },
			{ contact: 'member@example.com', createdAt: past, id: MEMBER_ID },
			{ closedAt: past, closedReason: 'user_requested', createdAt: past, id: CLOSED_ID },
		])
		.run();
	return () => db.$client.close();
});

afterEach(() => {
	vi.useRealTimers();
});

const getUser = (userId: number) =>
	db.select().from(userTable).where(eq(userTable.id, userId)).get();
const getRoles = () => db.select().from(userRoleTable).orderBy(userRoleTable.id).all();

describe('closeUser', () => {
	beforeEach(() => {
		db.insert(userProfileTable)
			.values({ birthDate: '2000-01-01', createdAt: past, userId: MEMBER_ID })
			.run();
		db.insert(userRoleTable)
			.values([
				{ ...validUserRole, revokedAt: past, revokedReason: 'user_requested' },
				validUserRole,
			])
			.run();
		db.insert(userSessionTable)
			.values([
				validUserSession, // active
				{ ...validUserSession, expiresAt: now }, // expired
				{ ...validUserSession, revokedAt: past, revokedReason: 'user_logged_out' },
			])
			.run();
		seedLogin(db, { contact: 'member@example.com', userId: MEMBER_ID });
		seedLogin(db, { contact: 'member@example.com' }); // before sign-up
		seedLogin(db, { contact: 'admin@example.com', userId: ADMIN_ID });
	});

	test('closes the user and cascades with the actor', () => {
		expect(
			closeUser(db, { closedBy: ADMIN_ID, closedReason: 'user_requested', id: MEMBER_ID }),
		).toBe(true);
		expect(getUser(MEMBER_ID)).toMatchObject({
			closedAt: now,
			closedBy: ADMIN_ID,
			closedReason: 'user_requested',
		});
		expect(getRoles().map((role) => [role.revokedAt, role.revokedBy, role.revokedReason])).toEqual([
			[past, null, 'user_requested'],
			[now, ADMIN_ID, 'cascade_user_closed'],
		]);
		const sessions = db.select().from(userSessionTable).orderBy(userSessionTable.id).all();
		expect(
			sessions.map((session) => [session.revokedAt, session.revokedBy, session.revokedReason]),
		).toEqual([
			[now, ADMIN_ID, 'cascade_user_closed'],
			[null, null, null], // expired
			[past, null, 'user_logged_out'],
		]);
	});

	test('erases personal data', () => {
		closeUser(db, { closedBy: MEMBER_ID, closedReason: 'user_requested', id: MEMBER_ID });
		expect(getUser(MEMBER_ID)?.contact).toBeNull();
		expect(db.select().from(userProfileTable).all()).toEqual([]);
		expect(db.select({ userId: loginTable.userId }).from(loginTable).all()).toEqual([
			{ userId: ADMIN_ID },
		]);
		expect(db.select().from(loginAttemptTable).all()).toHaveLength(1);
	});

	test('a ban keeps the contact', () => {
		closeUser(db, { closedBy: ADMIN_ID, closedReason: 'admin_banned', id: MEMBER_ID });
		expect(getUser(MEMBER_ID)?.contact).toBe('member@example.com');
	});

	test.for([MISSING_ID, CLOSED_ID])('returns false for user %i', (id) => {
		const userBefore = getUser(id);
		expect(closeUser(db, { closedBy: ADMIN_ID, closedReason: 'admin_removed', id })).toBe(false);
		expect(getUser(id)).toEqual(userBefore);
	});

	test.for([MISSING_ID, CLOSED_ID])('returns false for actor %i', (closedBy) => {
		expect(closeUser(db, { closedBy, closedReason: 'admin_removed', id: MEMBER_ID })).toBe(false);
		expect(getUser(MEMBER_ID)?.closedAt).toBeNull();
		expect(db.select().from(loginTable).all()).toHaveLength(3);
	});
});

describe('grantRole', () => {
	test('grants the role', () => {
		const roleId = grantRole(db, { assignedBy: ADMIN_ID, role: 'admin', userId: MEMBER_ID });
		expect(getRoles()).toMatchObject([
			{ assignedAt: now, assignedBy: ADMIN_ID, id: roleId, userId: MEMBER_ID },
		]);
	});

	test('ignores revoked roles', () => {
		db.insert(userRoleTable)
			.values({ ...validUserRole, revokedAt: past, revokedReason: 'user_requested' })
			.run();
		expect(grantRole(db, { assignedBy: null, role: 'admin', userId: MEMBER_ID })).toBeTruthy();
	});

	test('returns undefined if the role is active', () => {
		grantRole(db, { assignedBy: null, role: 'admin', userId: MEMBER_ID });
		expect(grantRole(db, { assignedBy: null, role: 'admin', userId: MEMBER_ID })).toBeUndefined();
		expect(getRoles()).toHaveLength(1);
	});

	test.for([MISSING_ID, CLOSED_ID])('returns undefined for user %i', (userId) => {
		expect(grantRole(db, { assignedBy: null, role: 'admin', userId })).toBeUndefined();
		expect(getRoles()).toEqual([]);
	});

	test.for([MISSING_ID, CLOSED_ID])('returns undefined for actor %i', (assignedBy) => {
		expect(grantRole(db, { assignedBy, role: 'admin', userId: MEMBER_ID })).toBeUndefined();
		expect(getRoles()).toEqual([]);
	});
});

describe('revokeRole', () => {
	beforeEach(() => {
		db.insert(userRoleTable).values(validUserRole).run();
	});

	test('revokes the role', () => {
		expect(
			revokeRole(db, {
				revokedBy: ADMIN_ID,
				revokedReason: 'admin_removed',
				role: 'admin',
				userId: MEMBER_ID,
			}),
		).toBe(true);
		expect(getRoles()).toMatchObject([
			{ revokedAt: now, revokedBy: ADMIN_ID, revokedReason: 'admin_removed' },
		]);
	});

	test('returns false if the role is revoked', () => {
		revokeRole(db, {
			revokedBy: MEMBER_ID,
			revokedReason: 'user_requested',
			role: 'admin',
			userId: MEMBER_ID,
		});
		vi.setSystemTime(future);
		expect(
			revokeRole(db, {
				revokedBy: ADMIN_ID,
				revokedReason: 'admin_removed',
				role: 'admin',
				userId: MEMBER_ID,
			}),
		).toBe(false);
		expect(getRoles()).toMatchObject([{ revokedAt: now, revokedReason: 'user_requested' }]);
	});

	test.for([MISSING_ID, CLOSED_ID])('returns false for actor %i', (revokedBy) => {
		expect(
			revokeRole(db, {
				revokedBy,
				revokedReason: 'admin_removed',
				role: 'admin',
				userId: MEMBER_ID,
			}),
		).toBe(false);
		expect(getRoles()).toMatchObject([{ revokedAt: null }]);
	});
});
