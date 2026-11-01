// TODO Rename DatabaseSync to Database everywhere (deprecated since Node.js 26.11, DEP0210)
// once @types/node declares it (26.11 or later).
import { DatabaseSync } from 'node:sqlite';

export const openConnection = (path: string) => {
	const connection = new DatabaseSync(path, {
		// See https://sqlite.org/c3ref/busy_timeout.html
		timeout: 5000,
	});
	// See https://github.com/nodejs/node/issues/62722
	connection.exec('PRAGMA journal_mode = WAL');
	return connection;
};
