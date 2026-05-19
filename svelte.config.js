import adapter from '@sveltejs/adapter-node';
import { env } from 'node:process';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	kit: {
		experimental: {
			instrumentation: { server: true },
			remoteFunctions: true,
		},
		version: {
			name: env.SVELTE_KIT_BUILD_TIMESTAMP,
		},
		adapter: adapter({
			out: env.SVELTE_KIT_BUILD_TIMESTAMP && `build/${env.SVELTE_KIT_BUILD_TIMESTAMP}`,
		}),
	},
	compilerOptions: {
		experimental: { async: true },
	},
};

export default config;
