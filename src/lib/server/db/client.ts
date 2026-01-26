import { env } from '$env/dynamic/private';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { relations } from './relations.ts';
import * as schema from './schema.ts';

if (!env.DATABASE_URL) throw new Error('DATABASE_URL is not set');

export const db = drizzle(env.DATABASE_URL, {
	casing: 'snake_case',
	schema,
	relations,
});

// See https://github.com/tursodatabase/libsql/issues/1553
db.$client.pragma('journal_mode = WAL');

process.on('sveltekit:shutdown', () => db.$client.close());
