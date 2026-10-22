import { defineConfig } from '@playwright/test';

const PORT = 6526;

export default defineConfig({
	testMatch: '**/*.e2e.{js,ts}',
	webServer: {
		command: `vpr build --mode e2e && vpr preview --mode e2e --port ${PORT}`,
		port: PORT,
	},
});
