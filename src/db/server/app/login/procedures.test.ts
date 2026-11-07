import { eq } from 'drizzle-orm';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vite-plus/test';
import type { AppDb } from '#db/app/drizzle.ts';
import {
	completeLogin,
	discardLogin,
	markLoginSent,
	startLogin,
} from '#db/app/login/procedures.ts';
import { loginAttemptTable, loginTable, userSessionTable, userTable } from '#db/app/schema.ts';
import { createTestAppDb, seedPendingLogin, seedUser } from '#db/app/testing.ts';
import { closeUser } from '#db/app/user/procedures.ts';
import { LOGIN_CODE_LIFETIME_MS, SESSION_LIFETIME_MS } from '#lib/auth/config.ts';
import { createSecret, hashLoginCode, hashSessionSecret } from '#lib/server/auth/token.ts';

const config = vi.hoisted(() => ({ isSignUpOpen: true }));
vi.mock(import('#lib/auth/config.ts'), (importOriginal) =>
	importOriginal().then((original) => ({
		...original,
		get IS_SIGN_UP_OPEN() {
			return config.isSignUpOpen;
		},
	})),
);

const now = new Date('2026-01-02T00:00:00Z');
const CONTACT = 'a@example.com';

let db: AppDb;

beforeEach(() => {
	vi.useFakeTimers({ now, toFake: ['Date'] });
	config.isSignUpOpen = true;
	db = createTestAppDb();
	return () => db.$client.close();
});

afterEach(() => {
	vi.useRealTimers();
});

const getLogins = () => db.select().from(loginTable).orderBy(loginTable.id).all();
const getAttempts = () => db.select().from(loginAttemptTable).orderBy(loginAttemptTable.id).all();
const getSessions = () => db.select().from(userSessionTable).all();

const start = (contact = CONTACT) =>
	startLogin(db, { codeHash: hashLoginCode(createSecret(), '000000'), contact, ip: '::1' });

describe('startLogin', () => {
	test('creates a login that expires in 3 minutes', () => {
		const started = start();
		expect(getLogins()).toMatchObject([
			{
				contact: CONTACT,
				createdAt: now,
				expiresAt: new Date(now.getTime() + LOGIN_CODE_LIFETIME_MS),
				userId: null,
			},
		]);
		expect(started).toEqual({ loginId: getLogins()[0]?.id, ok: true });
	});

	test('links an existing user', () => {
		const { userId } = seedUser(db, { contact: CONTACT });
		start();
		expect(getLogins()).toMatchObject([{ userId }]);
	});

	test('returns login_pending while a login is pending', () => {
		start();
		expect(start()).toEqual({ error: 'login_pending', ok: false });
		expect(getLogins()).toHaveLength(1);
		expect(start('b@example.com')).toMatchObject({ ok: true });
	});

	test('allows a new login once the pending one expires', () => {
		start();
		vi.setSystemTime(now.getTime() + LOGIN_CODE_LIFETIME_MS);
		expect(start()).toMatchObject({ ok: true });
	});

	test('allows a new login once attempts run out', () => {
		const { loginId } = seedPendingLogin(db, { contact: CONTACT });
		const attempt = () =>
			completeLogin(db, {
				codeHash: Buffer.alloc(32),
				ip: '::1',
				loginId,
				secretHash: hashSessionSecret(createSecret()),
			});
		attempt();
		expect(start()).toEqual({ error: 'login_pending', ok: false });
		attempt();
		expect(start()).toMatchObject({ ok: true });
	});

	test('allows a new login once the pending one is used', () => {
		const { code, loginId, secret } = seedPendingLogin(db, { contact: CONTACT });
		completeLogin(db, {
			codeHash: hashLoginCode(secret, code),
			ip: '::1',
			loginId,
			secretHash: hashSessionSecret(createSecret()),
		});
		expect(start()).toMatchObject({ ok: true });
	});

	test('returns user_closed for a banned contact', () => {
		const { userId } = seedUser(db, { contact: CONTACT });
		closeUser(db, { closedBy: null, closedReason: 'system_removed', userId });
		// Erased, so the contact can sign up again
		expect(start()).toMatchObject({ ok: true });

		const banned = seedUser(db, { contact: 'b@example.com' });
		const admin = seedUser(db);
		closeUser(db, { closedBy: admin.userId, closedReason: 'admin_banned', userId: banned.userId });
		expect(start('b@example.com')).toEqual({ error: 'user_closed', ok: false });
	});

	test('returns sign_up_closed for a new contact while sign-up is closed', () => {
		config.isSignUpOpen = false;
		expect(start()).toEqual({ error: 'sign_up_closed', ok: false });
		expect(getLogins()).toEqual([]);

		seedUser(db, { contact: 'b@example.com' });
		expect(start('b@example.com')).toMatchObject({ ok: true });
	});
});

describe('markLoginSent', () => {
	test('sets the send ID once', () => {
		const { loginId } = seedPendingLogin(db, { contact: CONTACT });
		expect(markLoginSent(db, { loginId, sendId: 'a' })).toEqual({ ok: true });
		expect(markLoginSent(db, { loginId, sendId: 'b' })).toEqual({
			error: 'login_already_sent',
			ok: false,
		});
		expect(getLogins()).toMatchObject([{ sendId: 'a' }]);
	});

	test('returns login_not_found for an expired login', () => {
		const { loginId } = seedPendingLogin(db, { contact: CONTACT });
		vi.setSystemTime(now.getTime() + LOGIN_CODE_LIFETIME_MS);
		expect(markLoginSent(db, { loginId, sendId: 'a' })).toEqual({
			error: 'login_not_found',
			ok: false,
		});
		expect(getLogins()).toMatchObject([{ sendId: null }]);
	});
});

describe('discardLogin', () => {
	test('deletes a login without attempts', () => {
		const { loginId } = seedPendingLogin(db, { contact: CONTACT });
		expect(discardLogin(db, { loginId })).toEqual({ ok: true });
		expect(getLogins()).toEqual([]);
	});

	test('returns login_attempted for an attempted login', () => {
		const { loginId } = seedPendingLogin(db, { contact: CONTACT });
		completeLogin(db, {
			codeHash: Buffer.alloc(32),
			ip: '::1',
			loginId,
			secretHash: hashSessionSecret(createSecret()),
		});
		expect(discardLogin(db, { loginId })).toEqual({ error: 'login_attempted', ok: false });
		expect(getLogins()).toHaveLength(1);
	});

	test('returns login_not_found for a missing login', () => {
		expect(discardLogin(db, { loginId: 99 })).toEqual({ error: 'login_not_found', ok: false });
	});
});

describe('completeLogin', () => {
	const setup = ({ contact = CONTACT, userId = null as null | number } = {}) => {
		const login = seedPendingLogin(db, { contact, userId });
		const secretHash = hashSessionSecret(createSecret());
		const complete = (code = login.code) =>
			completeLogin(db, {
				codeHash: hashLoginCode(login.secret, code),
				ip: '::1',
				loginId: login.loginId,
				secretHash,
			});
		return { complete, login, secretHash };
	};

	const wrongCode = (code: string) => (code === '000000' ? '000001' : '000000');

	test('signs up a new contact and creates a session', () => {
		const { complete, login, secretHash } = setup();
		const result = complete();

		const [user] = db.select().from(userTable).all();
		expect(user).toMatchObject({ contact: CONTACT, createdAt: now, createdBy: null });
		expect(result).toEqual({
			expiresAt: new Date(now.getTime() + SESSION_LIFETIME_MS),
			isOnboarded: false,
			ok: true,
			userSessionId: getSessions()[0]?.id,
		});
		expect(getSessions()).toMatchObject([{ secretHash, userId: user?.id }]);
		expect(getLogins()).toMatchObject([{ id: login.loginId, userId: user?.id }]);
		expect(getAttempts()).toMatchObject([{ attemptedAt: now, success: true }]);
	});

	test('logs in an existing user', () => {
		const { userId } = seedUser(db, { contact: CONTACT });
		const { complete } = setup({ userId });
		expect(complete()).toMatchObject({ isOnboarded: true });
		expect(db.select().from(userTable).all()).toHaveLength(1);
		expect(getSessions()).toMatchObject([{ userId }]);
	});

	test('a code matches only with the secret it was requested with', () => {
		const { login } = setup();
		expect(
			completeLogin(db, {
				codeHash: hashLoginCode(createSecret(), login.code),
				ip: '::1',
				loginId: login.loginId,
				secretHash: hashSessionSecret(createSecret()),
			}),
		).toEqual({ error: 'code_mismatch', ok: false });
		expect(getSessions()).toEqual([]);
	});

	test('allows 2 attempts', () => {
		const { complete, login } = setup();
		expect(complete(wrongCode(login.code))).toEqual({ error: 'code_mismatch', ok: false });
		expect(complete()).toMatchObject({ userSessionId: expect.any(Number) });
	});

	test('returns login_not_found after 2 failed attempts', () => {
		const { complete, login } = setup();
		complete(wrongCode(login.code));
		complete(wrongCode(login.code));
		expect(complete()).toEqual({ error: 'login_not_found', ok: false });
		expect(getAttempts()).toHaveLength(2);
		expect(getSessions()).toEqual([]);
	});

	test('returns login_not_found once used', () => {
		const { complete } = setup();
		complete();
		expect(complete()).toEqual({ error: 'login_not_found', ok: false });
		expect(getAttempts()).toHaveLength(1);
		expect(getSessions()).toHaveLength(1);
	});

	test('returns login_not_found once expired', () => {
		const { complete } = setup();
		vi.setSystemTime(now.getTime() + LOGIN_CODE_LIFETIME_MS);
		expect(complete()).toEqual({ error: 'login_not_found', ok: false });
		expect(getAttempts()).toEqual([]);
	});

	test('rejects a banned user', () => {
		const { complete } = setup();
		const { userId } = seedUser(db, { contact: CONTACT });
		const admin = seedUser(db);
		closeUser(db, { closedBy: admin.userId, closedReason: 'admin_banned', userId });
		// closeUser erased the login, so seed another
		const login = seedPendingLogin(db, { contact: CONTACT });
		expect(
			completeLogin(db, {
				codeHash: hashLoginCode(login.secret, login.code),
				ip: '::1',
				loginId: login.loginId,
				secretHash: hashSessionSecret(createSecret()),
			}),
		).toEqual({ error: 'user_closed', ok: false });
		expect(complete()).toEqual({ error: 'login_not_found', ok: false });
		expect(getSessions()).toEqual([]);
	});

	test('rejects a new contact while sign-up is closed', () => {
		config.isSignUpOpen = false;
		const { complete } = setup();
		expect(complete()).toEqual({ error: 'sign_up_closed', ok: false });
		expect(db.select().from(userTable).all()).toEqual([]);
		expect(getSessions()).toEqual([]);

		const { userId } = seedUser(db, { contact: 'b@example.com' });
		expect(setup({ contact: 'b@example.com', userId }).complete()).toMatchObject({
			userSessionId: expect.any(Number),
		});
	});

	test('returns login_not_found for a missing login', () => {
		expect(
			completeLogin(db, {
				codeHash: Buffer.alloc(32),
				ip: '::1',
				loginId: 99,
				secretHash: hashSessionSecret(createSecret()),
			}),
		).toEqual({ error: 'login_not_found', ok: false });
		expect(getAttempts()).toEqual([]);
	});

	test('records the IP', () => {
		const { login } = setup();
		completeLogin(db, {
			codeHash: hashLoginCode(login.secret, login.code),
			ip: '203.0.113.1',
			loginId: login.loginId,
			secretHash: hashSessionSecret(createSecret()),
		});
		expect(getAttempts()).toMatchObject([{ ip: '203.0.113.1' }]);
		expect(
			db.select().from(userSessionTable).where(eq(userSessionTable.ip, '203.0.113.1')).all(),
		).toHaveLength(1);
	});
});
