import { relations } from '#lib/database/relations.ts';
import * as schema from '#lib/database/schema.ts';
import { dev } from '$app/environment';
import { DATABASE_URL } from '$env/static/private';
import { drizzle } from 'drizzle-orm/node-sqlite';

export const db = drizzle(DATABASE_URL, { schema, relations, jit: true });

if (!dev) db.$client.exec('PRAGMA journal_mode = WAL');

// See https://pm2.keymetrics.io/docs/usage/cluster-mode/#graceful-shutdown
// See https://svelte.dev/docs/kit/adapter-node#Graceful-shutdown
process.on('sveltekit:shutdown', () => db.$client.close());
