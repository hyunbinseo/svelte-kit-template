import { drizzle } from 'drizzle-orm/better-sqlite3';
import { resolve } from 'node:path';
import { env, loadEnvFile } from 'node:process';
import { relations } from '../src/lib/database/relations.ts';
import * as schema from '../src/lib/database/schema.ts';
import { root } from './utilities.ts';

loadEnvFile(resolve(root, '.env'));

if (!env.DATABASE_URL) throw new Error('DATABASE_URL is not set');

export const db = drizzle(env.DATABASE_URL, {
	casing: 'snake_case',
	schema,
	relations,
});
