import { randomBytes } from 'node:crypto';
import { existsSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { root } from '../utilities.ts';

const envFile = join(root, '.env.local');

if (existsSync(envFile)) throw new Error();

writeFileSync(
	envFile,
	`
JWT_SECRET_NEW="${randomBytes(32).toString('base64')}"
JWT_SECRET_OLD="${randomBytes(32).toString('base64')}"
`.slice(1),
);
