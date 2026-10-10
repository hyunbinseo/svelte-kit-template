import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll } from 'vite-plus/test';

export const createTemporaryDir = (prefix: string) => {
	const dir = mkdtempSync(join(tmpdir(), prefix));
	afterAll(() => rmSync(dir, { recursive: true, force: true }));
	return dir;
};
