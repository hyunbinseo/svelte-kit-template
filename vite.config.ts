import { sentrySvelteKit } from '@sentry/sveltekit';
import adapter from '@sveltejs/adapter-node';
import { sveltekit } from '@sveltejs/kit/vite';
import tailwindcss from '@tailwindcss/vite';
import { env } from 'node:process';
import { defineConfig } from 'vite';

export default defineConfig({
	build: { target: 'es2023' },
	plugins: [
		tailwindcss(), //
		sentrySvelteKit({ telemetry: false }),
		sveltekit({
			compilerOptions: {
				experimental: { async: true },
			},
			experimental: {
				explicitEnvironmentVariables: true,
				instrumentation: { server: true },
				remoteFunctions: true,
			},
			version: {
				...(env.SVELTE_KIT_BUILD_TIMESTAMP && { name: env.SVELTE_KIT_BUILD_TIMESTAMP }),
			},
			adapter: adapter({
				...(env.SVELTE_KIT_BUILD_TIMESTAMP && { out: `build/${env.SVELTE_KIT_BUILD_TIMESTAMP}` }),
			}),
		}),
	],
	server: { port: 5526, strictPort: true },
	preview: { port: 4526, strictPort: true },
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
