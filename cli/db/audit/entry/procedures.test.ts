import { afterEach, beforeEach, expect, test, vi } from 'vite-plus/test';
import { purgeEntries } from '#cli/db/audit/entry/procedures.ts';
import type { AuditDb } from '#db/audit/drizzle.ts';
import { type EntryInsert, entrySqlTable, entryTable } from '#db/audit/schema.ts';
import { createTestAuditDb } from '#db/audit/testing.ts';

// Month ends clamp.
const now = new Date('2026-05-31T00:00:00Z');
const threeMonthsAgo = new Date('2026-02-28T00:00:00Z');
const twoYearsAgo = new Date('2024-05-31T00:00:00Z');
const justAfter = (date: Date) => new Date(date.getTime() + 1);
const justBefore = (date: Date) => new Date(date.getTime() - 1);

const SQL_ID = 1;

let db: AuditDb;

beforeEach(() => {
	vi.useFakeTimers({ now, toFake: ['Temporal'] });
	db = createTestAuditDb();
	db.insert(entrySqlTable)
		.values({ hash: Buffer.alloc(32), id: SQL_ID, sql: 'commit' })
		.run();
	return () => db.$client.close();
});

afterEach(() => {
	vi.useRealTimers();
});

const validEntry = {
	byStaff: false,
	failed: false,
	params: '[]',
	pathname: '/',
	sqlId: SQL_ID,
} satisfies Omit<EntryInsert, 'loggedAt'>;

test('purges staff entries after 2 years and others after 3 months', () => {
	db.insert(entryTable)
		.values([
			{ ...validEntry, byStaff: true, loggedAt: justBefore(twoYearsAgo) }, // expired
			{ ...validEntry, byStaff: true, loggedAt: twoYearsAgo },
			{ ...validEntry, byStaff: true, loggedAt: justAfter(twoYearsAgo) },
			{ ...validEntry, loggedAt: justBefore(threeMonthsAgo) }, // expired
			{ ...validEntry, loggedAt: threeMonthsAgo },
			{ ...validEntry, loggedAt: justAfter(threeMonthsAgo) },
		])
		.run();

	expect(purgeEntries(db)).toBe(2);
	expect(db.select({ id: entryTable.id }).from(entryTable).orderBy(entryTable.id).all()).toEqual([
		{ id: 2 },
		{ id: 3 },
		{ id: 5 },
		{ id: 6 },
	]);
});
