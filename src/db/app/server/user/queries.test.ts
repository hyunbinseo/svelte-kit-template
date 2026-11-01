import { beforeEach, expect, test } from 'vite-plus/test';
import type { AppDb } from '#db/app/server/database.ts';
import { type UserRoleInsert, userRoleTable, userTable } from '#db/app/server/schema.ts';
import { createTestAppDatabase } from '#db/app/server/testing.ts';
import { hasActiveUserRole } from '#db/app/server/user/queries.ts';

const past = new Date('2026-01-01T00:00:00Z');

const STAFF_ID = 1;
const FORMER_STAFF_ID = 2;
const MEMBER_ID = 3;

let db: AppDb;

beforeEach(() => {
	db = createTestAppDatabase();
	return () => db.$client.close();
});

test('hasActiveUserRole ignores revoked roles', () => {
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

	expect(hasActiveUserRole(db, { userId: STAFF_ID })).toBe(true);
	expect(hasActiveUserRole(db, { userId: FORMER_STAFF_ID })).toBe(false);
	expect(hasActiveUserRole(db, { userId: MEMBER_ID })).toBe(false);
});
