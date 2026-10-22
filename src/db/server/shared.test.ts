import { chmodSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, expect, test } from 'vite-plus/test';
import { prepareDatabaseFile } from '#db/server/shared.ts';

let dataDir: string;

beforeEach(() => {
	dataDir = mkdtempSync(join(tmpdir(), 'databases-'));
});

afterEach(() => {
	rmSync(dataDir, { force: true, recursive: true });
});

test('returns [dataDir]/[mode]/[name].db', () => {
	expect(prepareDatabaseFile(dataDir, 'e2e', 'audit')).toBe(join(dataDir, 'e2e', 'audit.db'));
});

test.skipIf(process.platform === 'win32')('throws if other users can access the directory', () => {
	prepareDatabaseFile(dataDir, 'e2e', 'app');
	chmodSync(join(dataDir, 'e2e'), 0o750);
	expect(() => prepareDatabaseFile(dataDir, 'e2e', 'app')).toThrow("'750' !== '700'");
});
