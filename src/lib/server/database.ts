import { env } from '$env/dynamic/private';
import { relations } from '$lib/database/relations';
import * as schema from '$lib/database/schema';
import { drizzle } from 'drizzle-orm/better-sqlite3';

if (!env.DATABASE_URL) throw new Error('DATABASE_URL is not set');

export const db = drizzle(env.DATABASE_URL, {
	casing: 'snake_case',
	schema,
	relations,
});

// See https://github.com/tursodatabase/libsql/issues/1553
db.$client.pragma('journal_mode = WAL');

// See https://svelte.dev/docs/kit/adapter-node#Graceful-shutdown
process.on('sveltekit:shutdown', () => db.$client.close());
