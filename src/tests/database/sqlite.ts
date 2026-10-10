import assert from 'node:assert/strict';
import { DrizzleQueryError } from 'drizzle-orm';

type SQLiteErrorFields = { code: 'ERR_SQLITE_ERROR'; errcode: number };

const createSQLiteErrorFields = (errcode: number): SQLiteErrorFields => ({
	code: 'ERR_SQLITE_ERROR',
	errcode,
});

export const sqliteBusyError = createSQLiteErrorFields(5);
export const sqliteBusySnapshotError = createSQLiteErrorFields(517);
export const sqliteConstraintUniqueError = createSQLiteErrorFields(2067);

export const drizzleQueryErrorCausedBy =
	(expected: SQLiteErrorFields) =>
	(error: unknown): true => {
		assert(error instanceof DrizzleQueryError);
		assert.partialDeepStrictEqual({ ...error.cause }, expected);
		return true;
	};
