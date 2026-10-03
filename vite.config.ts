import { sentrySvelteKit } from '@sentry/sveltekit/vite';
import adapter from '@sveltejs/adapter-node';
import { sveltekit } from '@sveltejs/kit/vite';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vite';

const buildId = Math.floor(Date.now() / 1000).toString();

export default defineConfig({
	build: { target: 'es2023' },
	plugins: [
		tailwindcss(),
		{
			name: 'log-build-id',
			buildApp: {
				order: 'post',
				handler: async () => void console.table({ BUILD_ID: buildId }),
			},
		},
		sentrySvelteKit({ telemetry: false }),
		sveltekit({
			compilerOptions: {
				runes: ({ filename }) =>
					filename.split(/[/\\]/).includes('node_modules') ? undefined : true,
				experimental: { async: true },
			},
			experimental: { remoteFunctions: true },
			tracing: { server: true },
			version: { name: buildId },
			adapter: adapter({ out: `build/${buildId}` }),
		}),
	],
	server: { port: 5526 },
	preview: { port: 4526 },
});

// vite@8 roughly requires ES2023:
//
// | Browser | vite@8 | ES2023 |
// | ------- | ------ | ------ |
// | Chrome  | 111    | 110    |
// | Safari  | 16.4   | 16.4   |
// | Firefox | 114    | 115\*  |
//
// See https://caniuse.com/sr-es14
// See https://vite.dev/guide/build.html#browser-compatibility
