import adapter from '@sveltejs/adapter-node';
import { env } from 'node:process';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	kit: {
		experimental: { remoteFunctions: true },
		adapter: adapter({ out: env.SVELTE_KIT_NODE_ADAPTER_OUT }),
	},
	compilerOptions: {
		experimental: { async: true },
	},
};

export default config;
