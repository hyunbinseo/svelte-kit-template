import { defineConfig, lazyPlugins } from 'vite-plus';

const buildId = Math.floor(Date.now() / 1000).toString();

export default defineConfig({
	server: { port: 5526 },
	build: { target: 'es2023' }, // sync with app.html browser check
	preview: { port: 4526 },
	fmt: {
		ignorePatterns: ['/drizzle/', '/static/'],
		printWidth: 100,
		quoteProps: 'consistent',
		singleQuote: true,
		sortImports: { newlinesBetween: false },
		sortPackageJson: true,
		sortTailwindcss: { stylesheet: './src/routes/layout.css' },
		svelte: true,
		trailingComma: 'all',
		useTabs: true,
	},
	test: {},
	plugins:
		lazyPlugins(async () => {
			const { default: tailwindcss } = await import('@tailwindcss/vite');
			const { sentrySvelteKit } = await import('@sentry/sveltekit/vite');
			const { sveltekit } = await import('@sveltejs/kit/vite');
			const { default: adapter } = await import('@sveltejs/adapter-node');

			return [
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
					paths: { relative: false }, // see https://github.com/sveltejs/kit/issues/17357
					tracing: { server: true },
					version: { name: buildId },
					adapter: adapter({ out: `build/${buildId}` }),
				}),
			];
		}) ?? [],
});
