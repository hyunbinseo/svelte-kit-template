import assert from 'node:assert/strict';
import { test } from 'vite-plus/test';
import {
	createAppDb,
	findTokenBans,
	seedToken,
	seedTokenBan,
	seedUser,
} from '#tests/database/app.ts';
import { drizzleQueryErrorCausedBy, sqliteConstraintUniqueError } from '#tests/database/sqlite.ts';

const setup = () => {
	const db = createAppDb();
	const userId = seedUser(db).id;
	return { db, userId, token: seedToken(db, userId, 999_999_000) };
};

test('allows only one rotate ban per token', () => {
	const { db, userId, token } = setup();

	seedTokenBan(db, token.id, userId, 'rotate', Date.now());

	assert.throws(
		() => seedTokenBan(db, token.id, userId, 'rotate', Date.now()),
		drizzleQueryErrorCausedBy(sqliteConstraintUniqueError),
	);
});

test('allows other bans alongside a rotate ban', () => {
	const { db, userId, token } = setup();

	seedTokenBan(db, token.id, userId, 'rotate', Date.now());
	seedTokenBan(db, token.id, userId, 'stale', Date.now());
	seedTokenBan(db, token.id, userId, 'stale', Date.now());
	seedTokenBan(db, token.id, userId, 'logout', Date.now());

	assert.equal(findTokenBans(db, token.id).length, 4);
});
