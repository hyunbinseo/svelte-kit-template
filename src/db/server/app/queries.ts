import type { SQLiteTransactionConfig } from 'drizzle-orm/sqlite-core';
import type { AppDb, AppTx } from './types.ts';

type Reserved<T> = { [K in keyof T]: K extends 'transaction' | 'runCascade' ? never : unknown };

export const bindQueries =
	(baseDb: AppDb) =>
	<T extends Reserved<T>>(queries: (db: AppDb | AppTx) => T) => ({
		...queries(baseDb),
		transaction: <R>(
			callback: (tx: T) => ReturnType<Parameters<typeof baseDb.transaction<R>>[0]>,
			config?: SQLiteTransactionConfig,
		) =>
			baseDb.transaction<R>((tx) => {
				const result = callback(queries(tx));
				if (result instanceof Promise) {
					void result.catch(() => {});
					throw new TypeError('Transaction callback must be sync');
				}
				return result;
			}, config),
		runCascade: <A extends unknown[], R>(cascade: (db: AppDb, ...args: A) => R, ...args: A) =>
			cascade(baseDb, ...args),
	});
