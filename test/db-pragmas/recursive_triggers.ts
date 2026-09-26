import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { test } from 'node:test';
import { databaseSyncOptions } from '#lib/server/database/options.ts';

const createDb = () => {
	const db = new DatabaseSync(':memory:', databaseSyncOptions);
	db.exec('CREATE TABLE a (n INTEGER); CREATE TABLE b (n INTEGER); CREATE TABLE c (n INTEGER);');
	return db;
};

const countOf = (db: DatabaseSync, table: string) =>
	db.prepare(`SELECT count(*) AS count FROM ${table}`).get()?.['count'];

test('off by default', () => {
	using db = createDb();
	assert.equal(db.prepare('PRAGMA recursive_triggers').get()?.['recursive_triggers'], 0);
});

test('direct (A -> A) blocked', () => {
	using db = createDb();
	db.exec(
		'CREATE TRIGGER a_a AFTER INSERT ON a WHEN NEW.n < 10 BEGIN INSERT INTO a VALUES (NEW.n + 1); END',
	);

	db.exec('INSERT INTO a VALUES (0)');

	assert.equal(countOf(db, 'a'), 2);
});

test('cycle (A -> B -> A) blocked', () => {
	using db = createDb();
	db.exec(
		'CREATE TRIGGER a_b AFTER INSERT ON a WHEN NEW.n < 10 BEGIN INSERT INTO b VALUES (NEW.n + 1); END',
	);
	db.exec(
		'CREATE TRIGGER b_a AFTER INSERT ON b WHEN NEW.n < 10 BEGIN INSERT INTO a VALUES (NEW.n + 1); END',
	);

	db.exec('INSERT INTO a VALUES (0)');

	assert.equal(countOf(db, 'a'), 2);
	assert.equal(countOf(db, 'b'), 1);
});

test('unrelated cascade (A -> B -> C) not blocked', () => {
	using db = createDb();
	db.exec('CREATE TRIGGER a_b AFTER INSERT ON a BEGIN INSERT INTO b VALUES (NEW.n + 1); END');
	db.exec('CREATE TRIGGER b_c AFTER INSERT ON b BEGIN INSERT INTO c VALUES (NEW.n + 1); END');

	db.exec('INSERT INTO a VALUES (0)');

	assert.equal(countOf(db, 'c'), 1);
});
