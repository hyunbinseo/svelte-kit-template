import { relations } from '#lib/database/relations.ts';
import * as schema from '#lib/database/schema.ts';
import { dev } from '$app/environment';
import { env } from '$env/dynamic/private';
import { drizzle } from 'drizzle-orm/node-sqlite';

if (!env.DATABASE_URL) throw new Error('DATABASE_URL is not set');

export const db = drizzle(env.DATABASE_URL, {
	casing: 'snake_case',
	schema,
	relations,
});

if (!dev) db.$client.exec('PRAGMA journal_mode = WAL');

// See https://pm2.keymetrics.io/docs/usage/cluster-mode/#graceful-shutdown
// See https://svelte.dev/docs/kit/adapter-node#Graceful-shutdown
process.on('sveltekit:shutdown', () => db.$client.close());
