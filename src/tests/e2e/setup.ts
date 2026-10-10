import assert from 'node:assert/strict';
import { env } from 'node:process';
import { createAppDb } from '#tests/database/app.ts';
import { removeDatabase } from './database.ts';

assert(env.DATABASE_APP_URL);
removeDatabase(env.DATABASE_APP_URL);
createAppDb(env.DATABASE_APP_URL);
