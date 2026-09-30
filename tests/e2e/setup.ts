import { rmSync } from 'node:fs';
import { createAppDb } from '#tests/database/app.ts';
import { DATABASE_URL } from './env.ts';

rmSync(DATABASE_URL, { force: true });
createAppDb(DATABASE_URL);
