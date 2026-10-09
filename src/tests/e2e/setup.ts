import assert from 'node:assert/strict';
import { rmSync } from 'node:fs';
import { env } from 'node:process';
import { createAppDb } from '#tests/database/app.ts';

assert(env.DATABASE_APP_URL);
for (const suffix of ['', '-wal', '-shm']) rmSync(env.DATABASE_APP_URL + suffix, { force: true });
createAppDb(env.DATABASE_APP_URL);
