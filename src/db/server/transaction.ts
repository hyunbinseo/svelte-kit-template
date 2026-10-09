import type { AnyRelations } from 'drizzle-orm';
import type { NodeSQLiteDatabase, NodeSQLiteTransaction } from 'drizzle-orm/node-sqlite';
import type { SQLiteTransactionConfig } from 'drizzle-orm/sqlite-core';

type Queries<D> = Record<string, (database: D, ...args: never[]) => unknown>;

type BoundQueries<Q> = {
	[K in keyof Q]: Q[K] extends (database: never, ...args: infer A) => infer Result
		? (...args: A) => Result
		: never;
};

const bindQueries = <D, Q extends Queries<D>>(database: D, queries: Q) =>
	Object.fromEntries(
		Object.entries(queries).map(([name, execute]) => [
			name,
			(...args: never[]) => execute(database, ...args),
		]),
	) as BoundQueries<Q>;

export const withTransactions = <
	R extends AnyRelations,
	Q extends Queries<NodeSQLiteTransaction<R>>,
	A extends Queries<App.ReadDatabase<R>> = Record<never, never>,
>(
	database: NodeSQLiteDatabase<R>,
	queries: Q,
	auditedReads?: { database: App.ReadDatabase<R>; queries: A },
) => {
	const read = auditedReads
		? bindQueries(auditedReads.database, auditedReads.queries)
		: ({} as BoundQueries<A>);

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

	const transaction = <T>(
		callback: (
			tx: BoundQueries<Q> & { read: BoundQueries<A> },
		) => T & (T extends PromiseLike<unknown> ? never : unknown),
		config?: SQLiteTransactionConfig,
	): T => run((tx) => callback({ ...bindQueries(tx, queries), read }), config);

	const single = Object.fromEntries(
		Object.entries(queries).map(([name, execute]) => [
			name,
			(...args: never[]) => run((tx) => execute(tx, ...args)),
		]),
	) as BoundQueries<Q>;

	return { read, transaction: Object.assign(transaction, single) };
};
