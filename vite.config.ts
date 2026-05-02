import { sentrySvelteKit } from '@sentry/sveltekit';
import { sveltekit } from '@sveltejs/kit/vite';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vite';

export default defineConfig({
	build: { target: 'es2023' },
	plugins: [
		tailwindcss(), //
		sentrySvelteKit({ telemetry: false }),
		sveltekit(),
	],
	server: {
		port: 5263,
		strictPort: true,
	},
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
