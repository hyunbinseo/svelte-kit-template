import { mkdtempDisposableSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { expect, test } from 'vite-plus/test';
import { openConnection } from '#db/shared/connection.ts';

test('sets a busy timeout and WAL', () => {
	using tempDir = mkdtempDisposableSync(join(tmpdir(), 'connection-'));
	using connection = openConnection(join(tempDir.path, 'app.db'));
	expect(connection.prepare('PRAGMA busy_timeout').get()).toEqual({ timeout: 5000 });
	expect(connection.prepare('PRAGMA journal_mode').get()).toEqual({ journal_mode: 'wal' });
});
