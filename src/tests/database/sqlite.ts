type SQLiteErrorFields = { code: 'ERR_SQLITE_ERROR'; errcode: number };

const createSQLiteErrorFields = (errcode: number): SQLiteErrorFields => ({
	code: 'ERR_SQLITE_ERROR',
	errcode,
});

export const sqliteBusyError = createSQLiteErrorFields(5);
export const sqliteBusySnapshotError = createSQLiteErrorFields(517);
