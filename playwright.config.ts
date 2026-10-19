import { defineConfig } from '@playwright/test';

const PORT = 4174;

export default defineConfig({
	testMatch: '**/*.e2e.{js,ts}',
	webServer: { command: `vpr build && vpr preview --port ${PORT}`, port: PORT },
});
