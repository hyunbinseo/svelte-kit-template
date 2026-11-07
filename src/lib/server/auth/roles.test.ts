import { expect, test } from 'vite-plus/test';
import { createTestAppDb, seedUser } from '#db/app/testing.ts';
import { grantRole } from '#db/app/user/procedures.ts';
import { loadSessionRoles } from '#lib/server/auth/roles.ts';

test('loadSessionRoles caches per locals', () => {
	using db = createTestAppDb();
	const { userId } = seedUser(db);
	const locals: App.Locals = { session: { id: 1, isOnboarded: true, userId } };

	expect(loadSessionRoles(db, locals)).toEqual([]);
	grantRole(db, { assignedBy: null, role: 'admin', userId });
	expect(loadSessionRoles(db, locals)).toEqual([]); // same request
	expect(loadSessionRoles(db, { ...locals })).toEqual(['admin']); // next request
	expect(loadSessionRoles(db, {})).toEqual([]); // logged out
});
