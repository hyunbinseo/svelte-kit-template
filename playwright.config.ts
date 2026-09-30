/// <reference types="node" />

import { env } from 'node:process';
import { defineConfig } from '@playwright/test';
import { DATABASE_URL, JWT_SECRET_NEW, JWT_SECRET_OLD, SITE_NAME } from './tests/e2e/env.ts';

const PORT = 6526;

Object.assign(env, { DATABASE_URL, JWT_SECRET_NEW, JWT_SECRET_OLD, SITE_NAME });

export default defineConfig({
	testMatch: '**/*.e2e.{ts,js}',
	globalTeardown: './tests/e2e/teardown.ts',
	use: { baseURL: `http://localhost:${PORT}` },
	webServer: {
		command: `node tests/e2e/setup.ts && node --run dev -- --port ${PORT} --strictPort`,
		url: `http://localhost:${PORT}`,
	},
});
