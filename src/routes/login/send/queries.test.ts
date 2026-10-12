import assert from 'node:assert/strict';
import { afterEach, beforeEach, describe, test, vi } from 'vite-plus/test';
import { AUTH_CODE_EXPIRES_IN } from '#auth/config.ts';
import { deactivateUser } from '#database/app/procedures.ts';
import { SECOND } from '#lib/time.ts';
import { createAppDb, seedLogin, seedLoginAttempt, seedUser } from '#tests/database/app.ts';
import { findActiveUserByContact, findLatestUnexpiredLogin } from './queries.server.ts';

beforeEach(() => {
	vi.useFakeTimers({ toFake: ['Date'] });
	vi.setSystemTime(100_000);
});

afterEach(() => {
	vi.useRealTimers();
});

const setup = () => {
	const db = createAppDb();
	return { db, user: seedUser(db) };
};

describe('findActiveUserByContact', () => {
	test('finds the active user', () => {
		const { db, user } = setup();
		assert.deepEqual(findActiveUserByContact(db)(user.contact), { id: user.id });
	});

	test('ignores deactivated users', () => {
		const { db, user } = setup();
		deactivateUser(db, user.id, { deactivatedBy: seedUser(db).id, ip: '' });
		assert.equal(findActiveUserByContact(db)(user.contact), undefined);
	});
});

describe('findLatestUnexpiredLogin', () => {
	test('finds the latest login with its successful attempts', () => {
		const { db, user } = setup();
		seedLogin(db, user.contact, '1');
		seedLogin(db, user.contact, '2');
		seedLoginAttempt(db, '2', false);
		seedLoginAttempt(db, '2', true);

		const login = findLatestUnexpiredLogin(db)(user.contact);

		assert.equal(login?.successfulAttempts.length, 1);
	});

	test('ignores expired logins', () => {
		const { db, user } = setup();
		seedLogin(db, user.contact);
		vi.setSystemTime(100_000 + AUTH_CODE_EXPIRES_IN + SECOND);
		assert.equal(findLatestUnexpiredLogin(db)(user.contact), undefined);
	});
});
