import type { DBQueryConfig } from 'drizzle-orm';
import type { NodeSQLiteDatabase, NodeSQLiteTransaction } from 'drizzle-orm/node-sqlite';
import type { SQLiteTable } from 'drizzle-orm/sqlite-core';
import type { relations } from './relations.ts';
import type * as schema from './schema.ts';

type Relations = typeof relations;
type Schema<T extends Record<string, SQLiteTable> = typeof schema> = T;

export type AppDb = NodeSQLiteDatabase<Relations>;
export type AppTx = NodeSQLiteTransaction<Relations>;
export type AppDbOrTx = AppDb | AppTx;

export type AppFindConfig<
	T extends keyof Relations,
	R extends 'one' | 'many' = 'one', // omits `limit`, so also fits `findMany`
> = DBQueryConfig<R, Relations, Relations[T]>;

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
