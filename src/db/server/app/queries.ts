import type { SQLiteTransactionConfig } from 'drizzle-orm/sqlite-core';
import type { AppDb, AppTx } from './types.ts';

export const bindQueries =
	(baseDb: AppDb) =>
	<T>(queries: (db: AppDb | AppTx) => T) => ({
		...queries(baseDb),
		transaction: <R>(
			callback: (tx: T) => ReturnType<Parameters<typeof baseDb.transaction<R>>[0]>,
			config?: SQLiteTransactionConfig,
		) => baseDb.transaction<R>((tx) => callback(queries(tx)), config),
		runCascade: <A extends unknown[], R>(cascade: (db: AppDb, ...args: A) => R, ...args: A) =>
			cascade(baseDb, ...args),
	});
