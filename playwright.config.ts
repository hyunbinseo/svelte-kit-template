import { defineConfig } from '@playwright/test';
import { loadModeEnv } from '#cli/lib/shared.ts';

loadModeEnv('e2e'); // for the `db` fixture and teardown

const PORT = 6526;

export default defineConfig({
	globalTeardown: './tests/teardown.ts',
	testMatch: '**/*.e2e.{js,ts}',
	use: { baseURL: `http://localhost:${PORT}` },
	webServer: {
		// A fresh database before the server opens it
		command: `vpr db:reset:e2e && vpr build --mode e2e && vpr preview --mode e2e --port ${PORT}`,
		port: PORT,
	},
});
