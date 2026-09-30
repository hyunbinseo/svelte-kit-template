import { rmSync } from 'node:fs';
import { createDb } from '#tests/database/app.ts';
import { DATABASE_URL } from './env.ts';

rmSync(DATABASE_URL, { force: true });
createDb(DATABASE_URL);
