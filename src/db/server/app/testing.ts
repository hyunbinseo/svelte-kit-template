import { randomBytes, randomUUID } from 'node:crypto';
import { drizzle } from 'drizzle-orm/node-sqlite';
import { migrate } from 'drizzle-orm/node-sqlite/migrator';
import { type AppDb, createAppDb } from '#db/app/drizzle.ts';
import {
	loginAttemptTable,
	type LoginInsert,
	loginTable,
	userProfileTable,
	userSessionTable,
	userTable,
} from '#db/app/schema.ts';
import { openConnection } from '#db/shared/connection.ts';
import { LOGIN_CODE_LIFETIME_MS, SESSION_LIFETIME_MS } from '#lib/auth/config.ts';
import {
	createLoginCode,
	createSecret,
	formatToken,
	hashLoginCode,
	hashSessionSecret,
} from '#lib/server/auth/token.ts';

export const createTestAppDb = (path = ':memory:') => {
	const connection = openConnection(path);

	migrate(drizzle({ client: connection }), { migrationsFolder: 'drizzle/app' });

	// Disposable, for `using`
	return Object.assign(createAppDb(connection), {
		[Symbol.dispose]: () => connection.close(),
	});
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

// Unique per call, so E2E workers sharing a database don't collide
export const createTestContact = () => `${randomUUID()}@example.com`;

export const seedUser = (
	db: AppDb,
	{
		contact = createTestContact(),
		isOnboarded = true,
	}: { contact?: string; isOnboarded?: boolean } = {},
) => {
	const now = new Date();

	const userId = db
		.insert(userTable)
		.values({ contact, createdAt: now })
		.returning({ id: userTable.id })
		.get().id;

	if (isOnboarded) {
		db.insert(userProfileTable).values({ birthDate: '2000-01-01', createdAt: now, userId }).run();
	}

	return { contact, userId };
};

// Returns the cookie value, as the browser would hold it
export const seedUserSession = (
	db: AppDb,
	{
		expiresAt = new Date(Date.now() + SESSION_LIFETIME_MS),
		userId,
	}: { expiresAt?: Date; userId: number },
) => {
	const secret = createSecret();

	const userSessionId = db
		.insert(userSessionTable)
		.values({
			createdAt: new Date(Math.min(Date.now(), expiresAt.getTime() - 1)),
			expiresAt,
			ip: '::1',
			secretHash: hashSessionSecret(secret),
			userId,
		})
		.returning({ id: userSessionTable.id })
		.get().id;

	return { token: formatToken(userSessionId, secret), userSessionId };
};

// A pending login, with the code and login cookie value
export const seedPendingLogin = (
	db: AppDb,
	{ contact, userId = null }: { contact: string; userId?: null | number },
) => {
	const now = new Date();
	const code = createLoginCode();
	const secret = createSecret();

	const loginId = db
		.insert(loginTable)
		.values({
			codeHash: hashLoginCode(secret, code),
			contact,
			createdAt: now,
			expiresAt: new Date(now.getTime() + LOGIN_CODE_LIFETIME_MS),
			ip: '::1',
			userId,
		})
		.returning({ id: loginTable.id })
		.get().id;

	return { code, loginId, secret, token: formatToken(loginId, secret) };
};
