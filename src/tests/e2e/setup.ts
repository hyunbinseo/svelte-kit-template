import assert from 'node:assert/strict';
import { rmSync } from 'node:fs';
import { env } from 'node:process';
import { createAppDb } from '#tests/database/app.ts';

assert(env.DATABASE_URL);
rmSync(env.DATABASE_URL, { force: true });
createAppDb(env.DATABASE_URL);
