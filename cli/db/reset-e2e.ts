import { equal } from 'node:assert/strict';
import { rmSync } from 'node:fs';
import { join } from 'node:path';
import { env } from 'node:process';
import { parse } from 'valibot';
import { DbEnvSchema } from '#lib/env.ts';

// E2E only: other modes' data is never deleted by a script.
equal(env.MODE, 'e2e');

const dataDir = parse(DbEnvSchema.entries.DATA_DIR, env.DATA_DIR);
rmSync(join(dataDir, 'e2e'), { force: true, recursive: true });
