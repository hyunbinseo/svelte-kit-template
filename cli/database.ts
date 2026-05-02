import { relations } from '#lib/database/relations.ts';
import * as schema from '#lib/database/schema.ts';
import { drizzle } from 'drizzle-orm/node-sqlite';
import { resolve } from 'node:path';
import { env, loadEnvFile } from 'node:process';
import { root } from './utilities.ts';

loadEnvFile(resolve(root, '.env'));

if (!env.DATABASE_URL) throw new Error('DATABASE_URL is not set');

export const db = drizzle(env.DATABASE_URL, { schema, relations, jit: true });
