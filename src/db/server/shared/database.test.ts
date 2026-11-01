import { chmodSync, mkdtempDisposableSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, test } from 'vite-plus/test';
import { isAuditEnabled, prepareDatabasePath } from '#db/shared/database.ts';

describe('isAuditEnabled', () => {
	test('is off in development only', () => {
		expect(isAuditEnabled('development')).toBe(false);
		expect(isAuditEnabled('e2e')).toBe(true);
		expect(isAuditEnabled('production')).toBe(true);
	});
});

describe('prepareDatabasePath', () => {
	test('returns [dataDir]/[mode]/[name].db', () => {
		using dataDir = mkdtempDisposableSync(join(tmpdir(), 'databases-'));
		expect(prepareDatabasePath(dataDir.path, 'e2e', 'audit')).toBe(
			join(dataDir.path, 'e2e', 'audit.db'),
		);
	});

	test.skipIf(process.platform === 'win32')(
		'throws if other users can access the directory',
		() => {
			using dataDir = mkdtempDisposableSync(join(tmpdir(), 'databases-'));
			prepareDatabasePath(dataDir.path, 'e2e', 'app');
			chmodSync(join(dataDir.path, 'e2e'), 0o750);
			expect(() => prepareDatabasePath(dataDir.path, 'e2e', 'app')).toThrow("'750' !== '700'");
		},
	);
});
