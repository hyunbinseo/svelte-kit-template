import { randomBytes } from 'node:crypto';
import { beforeEach, expect, test } from 'vite-plus/test';
import type { AppDb } from '#db/app/server/database.ts';
import { type LoginInsert, loginTable } from '#db/app/server/schema/login.ts';
import { createTestDatabase } from '#db/app/server/testing.ts';

const now = new Date();
const after = new Date(now.getTime() + 1);

let db: AppDb;

beforeEach(() => {
	db = createTestDatabase();
	return () => db.$client.close();
});

const validLogin = {
	codeHash: randomBytes(32),
	contact: 'a@example.com',
	createdAt: now,
	expiresAt: after,
	ip: '::1',
} satisfies LoginInsert;

test('expiresAt must follow createdAt', () => {
	expect(() =>
		db
			.insert(loginTable)
			.values({ ...validLogin, expiresAt: now })
			.run(),
	).toThrow();
	db.insert(loginTable).values(validLogin).run();
});

test('codeHash is 32 bytes', () => {
	expect(() =>
		db
			.insert(loginTable)
			.values({ ...validLogin, codeHash: randomBytes(16) })
			.run(),
	).toThrow();
});
