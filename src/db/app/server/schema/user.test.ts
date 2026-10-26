import { randomBytes } from 'node:crypto';
import { sql } from 'drizzle-orm';
import { beforeEach, describe, expect, test } from 'vite-plus/test';
import type { AppDb } from '#db/app/server/database.ts';
import {
	type UserInsert,
	type UserProfileInsert,
	userProfileTable,
	type UserRoleInsert,
	userRoleTable,
	type UserSelect,
	type UserSessionInsert,
	userSessionTable,
	userTable,
} from '#db/app/server/schema/user.ts';
import { createTestDatabase } from '#db/app/server/testing.ts';

const now = new Date();
const before = new Date(now.getTime() - 1);
const after = new Date(now.getTime() + 1);

const USER_ID = 1;

// Values outside the enums cover the prefix rules, see specs/08-auth.md
// Only user runs them all; other tables share softDeleteChecks and test the wiring.
const reasonCases = [
	/* eslint-disable perfectionist/sort-objects */
	{ closedReason: 'account_closed', closedBy: null, isValid: false },
	{ closedReason: 'admin_x', closedBy: null, isValid: false },
	{ closedReason: 'admin_x', closedBy: USER_ID, isValid: true },
	{ closedReason: 'Admin_x', closedBy: USER_ID, isValid: false },
	{ closedReason: 'cascade_x', closedBy: null, isValid: true },
	{ closedReason: 'cascade_x', closedBy: USER_ID, isValid: true },
	{ closedReason: 'system_x', closedBy: null, isValid: true },
	{ closedReason: 'system_x', closedBy: USER_ID, isValid: false },
	{ closedReason: 'user_x', closedBy: null, isValid: true },
	{ closedReason: 'user_x', closedBy: USER_ID, isValid: true },
	{ closedReason: 'x', closedBy: null, isValid: false },
	/* eslint-enable perfectionist/sort-objects */
] as const satisfies readonly {
	closedBy: UserSelect['closedBy'];
	closedReason: string;
	isValid: boolean;
}[];

const validUser = {
	contact: 'a@example.com',
	createdAt: now,
} satisfies UserInsert;

let db: AppDb;

beforeEach(() => {
	db = createTestDatabase();
	db.insert(userTable)
		.values({ ...validUser, id: USER_ID })
		.run();
	return () => db.$client.close();
});

describe('user', () => {
	test('contact is unique', () => {
		expect(() => db.insert(userTable).values(validUser).run()).toThrow();
	});

	test('contact can be null only on closed users', () => {
		expect(() => db.update(userTable).set({ contact: null }).run()).toThrow();
		const closedUser = {
			...validUser,
			closedAt: now,
			closedReason: 'user_requested',
			contact: null,
		} satisfies UserInsert;
		db.insert(userTable).values(closedUser).run();
		db.insert(userTable).values(closedUser).run();
	});

	test('closedBy requires closedAt', () => {
		expect(() => db.update(userTable).set({ closedBy: USER_ID }).run()).toThrow();
		db.update(userTable)
			.set({ closedAt: now, closedBy: USER_ID, closedReason: 'admin_banned' })
			.run();
	});

	test('closedReason is set exactly when closedAt is', () => {
		expect(() => db.update(userTable).set({ closedAt: now }).run()).toThrow();
		expect(() => db.update(userTable).set({ closedReason: 'user_requested' }).run()).toThrow();
	});

	test.for(reasonCases)(
		'closedReason $closedReason, closedBy $closedBy: $isValid',
		(reasonCase) => {
			const insertClosedUser = () =>
				db
					.insert(userTable)
					.values({
						...validUser,
						closedAt: now,
						closedBy: reasonCase.closedBy,
						closedReason: reasonCase.closedReason as never,
						contact: null,
					})
					.run();
			if (reasonCase.isValid) expect(insertClosedUser).not.toThrow();
			else expect(insertClosedUser).toThrow();
		},
	);

	test('closedAt cannot precede createdAt', () => {
		expect(() =>
			db.update(userTable).set({ closedAt: before, closedReason: 'user_requested' }).run(),
		).toThrow();
	});
});

describe('userProfile', () => {
	const validUserProfile = {
		birthDate: '2000-01-01',
		createdAt: now,
		userId: USER_ID,
	} satisfies UserProfileInsert;

	test('birthDate must be a valid date', () => {
		for (const birthDate of ['2000-02-30', '2000-1-1', '20000101']) {
			expect(() =>
				db
					.insert(userProfileTable)
					.values({ ...validUserProfile, birthDate })
					.run(),
			).toThrow();
		}
		db.insert(userProfileTable)
			.values({ ...validUserProfile, birthDate: '2000-02-29' })
			.run();
	});

	test('foreign keys are enforced', () => {
		expect(db.get(sql`PRAGMA foreign_keys`)).toEqual({ foreign_keys: 1 });
		expect(() =>
			db
				.insert(userProfileTable)
				.values({ ...validUserProfile, userId: 2 })
				.run(),
		).toThrow();
	});
});

describe('userRole', () => {
	const validUserRole = {
		assignedAt: now,
		role: 'admin',
		userId: USER_ID,
	} satisfies UserRoleInsert;

	test('revokedBy requires revokedAt', () => {
		expect(() =>
			db
				.insert(userRoleTable)
				.values({ ...validUserRole, revokedBy: USER_ID })
				.run(),
		).toThrow();

		db.insert(userRoleTable)
			.values({
				...validUserRole,
				revokedAt: now,
				revokedBy: USER_ID,
				revokedReason: 'admin_removed',
			})
			.run();
	});

	test('revokedReason is set exactly when revokedAt is', () => {
		expect(() =>
			db
				.insert(userRoleTable)
				.values({ ...validUserRole, revokedAt: now })
				.run(),
		).toThrow();
		expect(() =>
			db
				.insert(userRoleTable)
				.values({ ...validUserRole, revokedReason: 'user_requested' })
				.run(),
		).toThrow();
	});

	test('revokedAt cannot precede assignedAt', () => {
		expect(() =>
			db
				.insert(userRoleTable)
				.values({ ...validUserRole, revokedAt: before, revokedReason: 'user_requested' })
				.run(),
		).toThrow();
	});

	test('revokedReason prefix is checked', () => {
		for (const revokedReason of ['admin_removed', 'x']) {
			expect(() =>
				db
					.insert(userRoleTable)
					.values({ ...validUserRole, revokedAt: now, revokedReason: revokedReason as never })
					.run(),
			).toThrow();
		}
	});

	test('one active row per user and role', () => {
		db.insert(userRoleTable).values(validUserRole).run();
		expect(() => db.insert(userRoleTable).values(validUserRole).run()).toThrow();
		db.update(userRoleTable).set({ revokedAt: now, revokedReason: 'user_requested' }).run();
		db.insert(userRoleTable).values(validUserRole).run();
	});

	test('deleted IDs are not reused', () => {
		const firstRole = db.insert(userRoleTable).values(validUserRole).returning().get();
		db.delete(userRoleTable).run();
		const secondRole = db.insert(userRoleTable).values(validUserRole).returning().get();
		expect(secondRole.id).toBeGreaterThan(firstRole.id);
	});
});

describe('userSession', () => {
	const validUserSession = {
		createdAt: now,
		expiresAt: after,
		ip: '::1',
		secretHash: randomBytes(32),
		userId: USER_ID,
	} satisfies UserSessionInsert;

	test('revokedBy requires revokedAt', () => {
		expect(() =>
			db
				.insert(userSessionTable)
				.values({ ...validUserSession, revokedBy: USER_ID })
				.run(),
		).toThrow();

		db.insert(userSessionTable)
			.values({
				...validUserSession,
				revokedAt: now,
				revokedBy: USER_ID,
				revokedReason: 'admin_terminated',
			})
			.run();
	});

	test('revokedReason is set exactly when revokedAt is', () => {
		expect(() =>
			db
				.insert(userSessionTable)
				.values({ ...validUserSession, revokedAt: now })
				.run(),
		).toThrow();
		expect(() =>
			db
				.insert(userSessionTable)
				.values({ ...validUserSession, revokedReason: 'user_logged_out' })
				.run(),
		).toThrow();
	});

	test('revokedAt cannot precede createdAt', () => {
		expect(() =>
			db
				.insert(userSessionTable)
				.values({ ...validUserSession, revokedAt: before, revokedReason: 'user_logged_out' })
				.run(),
		).toThrow();
	});

	test('revokedReason prefix is checked', () => {
		for (const revokedReason of ['admin_terminated', 'x']) {
			expect(() =>
				db
					.insert(userSessionTable)
					.values({ ...validUserSession, revokedAt: now, revokedReason: revokedReason as never })
					.run(),
			).toThrow();
		}
	});

	test('expiresAt must follow createdAt', () => {
		expect(() =>
			db
				.insert(userSessionTable)
				.values({ ...validUserSession, expiresAt: now })
				.run(),
		).toThrow();
		db.insert(userSessionTable).values(validUserSession).run();
	});

	test('secretHash is 32 bytes', () => {
		expect(() =>
			db
				.insert(userSessionTable)
				.values({ ...validUserSession, secretHash: randomBytes(16) })
				.run(),
		).toThrow();
	});
});
