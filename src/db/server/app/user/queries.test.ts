import { beforeEach, expect, test } from 'vite-plus/test';
import type { AppDb } from '#db/app/drizzle.ts';
import { type UserRoleInsert, userRoleTable, userTable } from '#db/app/schema.ts';
import { createTestAppDb, seedUser, seedUserSession } from '#db/app/testing.ts';
import { closeUser, revokeSession } from '#db/app/user/procedures.ts';
import { findActiveUserRoles, findActiveUserSession } from '#db/app/user/queries.ts';

const past = new Date('2026-01-01T00:00:00Z');

const STAFF_ID = 1;
const FORMER_STAFF_ID = 2;
const MEMBER_ID = 3;

let db: AppDb;

beforeEach(() => {
	db = createTestAppDb();
	return () => db.$client.close();
});

test('findActiveUserRoles ignores revoked roles', () => {
	db.insert(userTable)
		.values(
			[STAFF_ID, FORMER_STAFF_ID, MEMBER_ID].map((id) => ({
				contact: `${id}@example.com`,
				createdAt: past,
				id,
			})),
		)
		.run();

	const validUserRole = {
		assignedAt: past,
		role: 'admin',
		userId: STAFF_ID,
	} satisfies UserRoleInsert;
	db.insert(userRoleTable)
		.values([
			validUserRole,
			{
				...validUserRole,
				revokedAt: past,
				revokedReason: 'user_requested',
				userId: FORMER_STAFF_ID,
			},
		])
		.run();

	expect(findActiveUserRoles(db, { userId: STAFF_ID })).toEqual(['admin']);
	expect(findActiveUserRoles(db, { userId: FORMER_STAFF_ID })).toEqual([]);
	expect(findActiveUserRoles(db, { userId: MEMBER_ID })).toEqual([]);
});

test('findActiveUserSession returns onboarding state and skips inactive sessions', () => {
	const now = new Date();
	const onboarded = seedUser(db);
	const pending = seedUser(db, { isOnboarded: false });
	const closed = seedUser(db);

	const active = seedUserSession(db, { userId: onboarded.userId });
	const notOnboarded = seedUserSession(db, { userId: pending.userId });
	const expired = seedUserSession(db, { expiresAt: now, userId: onboarded.userId });
	const revoked = seedUserSession(db, { userId: onboarded.userId });
	revokeSession(db, {
		revokedBy: null,
		revokedReason: 'user_logged_out',
		userSessionId: revoked.userSessionId,
	});
	const ofClosed = seedUserSession(db, { userId: closed.userId });
	closeUser(db, { closedBy: null, closedReason: 'system_removed', userId: closed.userId });

	const find = (userSessionId: number) => findActiveUserSession(db, { now, userSessionId });
	expect(find(active.userSessionId)).toMatchObject({
		profileUserId: onboarded.userId,
		userId: onboarded.userId,
	});
	expect(find(notOnboarded.userSessionId)).toMatchObject({ profileUserId: null });
	expect(find(expired.userSessionId)).toBeUndefined();
	expect(find(revoked.userSessionId)).toBeUndefined();
	expect(find(ofClosed.userSessionId)).toBeUndefined();
});
