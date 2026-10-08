import type { AnyRelations } from 'drizzle-orm';
import type { NodeSQLiteDatabase, NodeSQLiteTransaction } from 'drizzle-orm/node-sqlite';
import type { SQLiteTransactionConfig } from 'drizzle-orm/sqlite-core';

export const withTransactions = <
	R extends AnyRelations,
	Q extends Record<string, (database: NodeSQLiteTransaction<R>, ...args: never[]) => unknown>,
>(
	database: NodeSQLiteDatabase<R>,
	queries: Q,
) => {
	const run = <T>(
		callback: (tx: NodeSQLiteTransaction<R>) => T,
		config?: SQLiteTransactionConfig,
	): T =>
		database.transaction((tx) => {
			const value = callback(tx);
			if (
				value !== null &&
				(typeof value === 'object' || typeof value === 'function') &&
				'then' in value &&
				typeof value.then === 'function'
			)
				throw new TypeError('Transaction callbacks must be synchronous.');
			return { value };
		}, config).value;

	const bind = (tx: NodeSQLiteTransaction<R>) =>
		Object.fromEntries(
			Object.entries(queries).map(([name, execute]) => [
				name,
				(...args: never[]) => execute(tx, ...args),
			]),
		) as {
			[K in keyof Q]: Q[K] extends (
				database: NodeSQLiteTransaction<R>,
				...args: infer A
			) => infer Result
				? (...args: A) => Result
				: never;
		};

	const transaction = <T>(
		callback: (
			tx: ReturnType<typeof bind>,
		) => T & (T extends PromiseLike<unknown> ? never : unknown),
		config?: SQLiteTransactionConfig,
	): T => run((tx) => callback(bind(tx)), config);

	const single = Object.fromEntries(
		Object.entries(queries).map(([name, execute]) => [
			name,
			(...args: never[]) => run((tx) => execute(tx, ...args)),
		]),
	) as ReturnType<typeof bind>;

	return { transaction: Object.assign(transaction, single) };
};
