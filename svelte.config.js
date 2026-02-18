import adapter from '@sveltejs/adapter-node';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	kit: {
		experimental: { remoteFunctions: true },
		adapter: adapter({ out: `build/${Date.now()}` }),
	},
	compilerOptions: {
		experimental: { async: true },
	},
};

export default config;
