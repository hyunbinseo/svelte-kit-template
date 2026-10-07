import assert from 'node:assert/strict';
import { resolve } from 'node:path';
import { env, loadEnvFile } from 'node:process';
import { defineConfig } from '@playwright/test';

loadEnvFile(resolve(import.meta.dirname, '.env.e2e'));

assert(env.DATABASE_APP_URL);
assert.match(env.DATABASE_APP_URL, /e2e\.db$/);

const PORT = 6526;
const BASE_URL = `http://localhost:${PORT}`;

export default defineConfig({
	testMatch: '**/*.e2e.{ts,js}',
	globalTeardown: './src/tests/e2e/teardown.ts',
	use: { baseURL: BASE_URL },
	webServer: {
		command: `node src/tests/e2e/setup.ts && node --run dev -- --mode e2e --port ${PORT} --strictPort`,
		url: BASE_URL,
	},
});
