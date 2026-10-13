import type { SQLiteTransactionConfig } from 'drizzle-orm/sqlite-core';
import type { AppDb, AppDbOrTx } from './types.ts';

type QueryFactories<T> = {
	[K in keyof T]: K extends 'transaction' | 'runProcedure' ? never : (db: AppDbOrTx) => unknown;
};

type BoundQueries<T> = {
	[K in keyof T]: T[K] extends (db: AppDbOrTx) => infer R ? R : never;
};

export const bindQueries =
	(baseDb: AppDb) =>
	<T extends QueryFactories<T>>(factories: T) => {
		const bind = (db: AppDbOrTx) =>
			Object.fromEntries(
				Object.entries<(db: AppDbOrTx) => unknown>(factories) //
					.map(([name, factory]) => [name, factory(db)]),
			) as BoundQueries<T>;

		return {
			...bind(baseDb),
			runProcedure: <A extends unknown[], R>(procedure: (db: AppDb, ...args: A) => R, ...args: A) =>
				procedure(baseDb, ...args),
			transaction: <R>(
				callback: (tx: BoundQueries<T>) => ReturnType<Parameters<typeof baseDb.transaction<R>>[0]>,
				config?: SQLiteTransactionConfig,
			) =>
				baseDb.transaction<R>((tx) => {
					const result = callback(bind(tx));
					if (result instanceof Promise) {
						void result.catch(() => {});
						throw new TypeError('Transaction callback must be sync');
					}
					return result;
				}, config),
		};
	};
