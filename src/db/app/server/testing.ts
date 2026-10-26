import { randomBytes } from 'node:crypto';
import { drizzle } from 'drizzle-orm/node-sqlite';
import { migrate } from 'drizzle-orm/node-sqlite/migrator';
import { type AppDb, createDatabase } from '#db/app/server/database.ts';
import { loginAttemptTable, type LoginInsert, loginTable } from '#db/app/server/schema.ts';
import { openDatabase } from '#db/shared.server.ts';

export const createTestDatabase = (path = ':memory:') => {
	const client = openDatabase(path);

	migrate(drizzle({ client }), { migrationsFolder: 'drizzle/app' });

	return createDatabase(client);
};

// A login with one attempt
export const seedLogin = (db: AppDb, login: Pick<LoginInsert, 'contact' | 'userId'>) => {
	const now = new Date();

	const insertedLogin = db
		.insert(loginTable)
		.values({
			...login,
			codeHash: randomBytes(32),
			createdAt: now,
			expiresAt: new Date(now.getTime() + 1),
			ip: '::1',
		})
		.returning({ id: loginTable.id })
		.get();

	db.insert(loginAttemptTable)
		.values({ attemptedAt: now, ip: '::1', loginId: insertedLogin.id, success: false })
		.run();

	return insertedLogin.id;
};
