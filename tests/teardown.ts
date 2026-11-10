import { rmSync } from 'node:fs';
import { join } from 'node:path';
import { parse } from 'valibot';
import { DbEnvSchema } from '#lib/env.ts';

// Runs before Playwright stops the server, whose open files outlive the unlink.
export default () => {
	const dataDir = parse(DbEnvSchema.entries.DATA_DIR, process.env.DATA_DIR);
	rmSync(join(dataDir, 'e2e'), { force: true, recursive: true });
};
