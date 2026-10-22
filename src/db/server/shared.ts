import { equal } from 'node:assert/strict';
import { mkdirSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import type { Mode } from '#lib/env.ts';

export type DatabaseName = 'app' | 'audit';

export const isAuditEnabled = (mode: Mode) => mode !== 'development';

const OWNER_ONLY = 0o700;

export const prepareDatabaseFile = (dataDir: string, mode: Mode, name: DatabaseName) => {
	const file = join(dataDir, mode, `${name}.db`);
	const dir = dirname(file);
	mkdirSync(dir, { mode: OWNER_ONLY, recursive: true });
	if (process.platform !== 'win32') {
		const permissions = statSync(dir).mode & 0o777;
		equal(permissions.toString(8), OWNER_ONLY.toString(8));
	}
	return file;
};
