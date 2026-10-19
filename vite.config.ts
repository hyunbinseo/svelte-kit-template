import { defineConfig, lazyPlugins } from 'vite-plus';

export default defineConfig({
	fmt: {
		ignorePatterns: ['/drizzle/', 'pnpm-lock.yaml'],
		printWidth: 100,
		singleQuote: true,
		sortImports: {
			internalPattern: ['#', '$app/', '$lib/'],
			newlinesBetween: false,
		},
		sortPackageJson: { sortScripts: true },
		sortTailwindcss: { stylesheet: './src/routes/layout.css' },
		svelte: true,
		useTabs: true,
	},
	plugins:
		lazyPlugins(async () => {
			const { default: tailwindcss } = await import('@tailwindcss/vite');
			const { sveltekit } = await import('@sveltejs/kit/vite');
			const { default: adapter } = await import('@sveltejs/adapter-node');
			return [
				tailwindcss(),
				sveltekit({
					adapter: adapter(),
					compilerOptions: {
						experimental: { async: true },
						runes: ({ filename }) =>
							filename.split(/[/\\]/).includes('node_modules') ? undefined : true,
					},
					experimental: { remoteFunctions: true },
					tracing: { server: true },
				}),
			];
		}) ?? [],
	preview: { port: 4526 },
	server: { port: 5526 },
	staged: {
		'!(*.{cjs,cts,js,mjs,mts,svelte,ts})': 'vp fmt --no-error-on-unmatched-pattern',
		'*.{cjs,cts,js,mjs,mts,svelte,ts}': ['eslint --fix', 'vp fmt'],
	},
	test: {
		expect: { requireAssertions: true },
		projects: [
			{
				extends: './vite.config.ts',
				test: {
					environment: 'node',
					include: ['src/**/*.{test,spec}.{js,ts}'],
					name: 'server',
				},
			},
		],
	},
});
