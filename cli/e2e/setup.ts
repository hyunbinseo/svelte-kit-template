import { rmSync } from 'node:fs';
import { DATABASE_URL } from '#cli/e2e/env.ts';
import { createDb } from '#cli/lib/database/app.testing.ts';

rmSync(DATABASE_URL, { force: true });
createDb(DATABASE_URL);
