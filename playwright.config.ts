import { defineConfig } from '@playwright/test';

const PORT = 6526;

export default defineConfig({
	testMatch: '**/*.e2e.{js,ts}',
	use: { baseURL: `http://localhost:${PORT}` },
	webServer: { command: `vpr build && vpr preview --port ${PORT}`, port: PORT },
});
