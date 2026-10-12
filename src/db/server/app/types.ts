import type { NodeSQLiteDatabase, NodeSQLiteTransaction } from 'drizzle-orm/node-sqlite';
import type { SQLiteTable } from 'drizzle-orm/sqlite-core';
import type { relations } from './relations.ts';
import type * as schema from './schema.ts';

export type AppDb = NodeSQLiteDatabase<typeof relations>;
export type AppTx = NodeSQLiteTransaction<typeof relations>;

export type AppDbOrTx = AppDb | AppTx;

type Schema<T extends Record<string, SQLiteTable> = typeof schema> = T;

export type AppSelect<
	T extends keyof Schema, //
	K extends keyof Schema[T]['$inferSelect'],
> = Pick<Schema[T]['$inferSelect'], K>;

export type AppInsert<
	T extends keyof Schema, //
	K extends keyof Schema[T]['$inferInsert'],
> = Pick<Schema[T]['$inferInsert'], K>;

export type AppRequired<
	T extends keyof Schema, //
	K extends keyof Schema[T]['$inferInsert'],
> = { [P in K]-?: NonNullable<Schema[T]['$inferInsert'][P]> };
