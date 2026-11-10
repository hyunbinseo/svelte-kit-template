import { equal } from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { copyFileSync, readFileSync } from 'node:fs';
import { basename, join } from 'node:path';
import { defineConfig, lazyPlugins } from 'vite-plus';

// The release: SvelteKit's version and Sentry's release, see specs/04-build-output.md
const commitSha = execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();

export default defineConfig({
	build: {
		// Keep target in sync with:
		// - src/app.html check
		// - tsconfig.json `lib`
		target: 'es2023',
	},
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
			const { sentrySvelteKit } = await import('@sentry/sveltekit/vite');
			const nodeAdapter = adapter();
			return [
				tailwindcss(),
				// Before sveltekit(). Uploads source maps when SENTRY_AUTH_TOKEN, SENTRY_ORG,
				// and SENTRY_PROJECT are set, see specs/10-observability.md
				...(await sentrySvelteKit({
					adapter: 'node',
					autoInstrument: false, // SvelteKit's own tracing covers load functions
					autoUploadSourceMaps: !!process.env.SENTRY_AUTH_TOKEN,
					release: { name: commitSha },
					telemetry: false,
				})),
				sveltekit({
					adapter: {
						...nodeAdapter,
						// Ships the pinned Node.js with the build, see specs/04-build-output.md
						adapt: async (builder) => {
							const packageJson = JSON.parse(
								readFileSync(join(import.meta.dirname, 'package.json'), 'utf8'),
							);
							equal(process.version, `v${packageJson.devEngines.runtime.version}`);

							await nodeAdapter.adapt(builder);
							copyFileSync(
								process.execPath,
								join(import.meta.dirname, 'build', basename(process.execPath)),
							);

							builder.log.success(`Version ${builder.config.version.name}`);
						},
					},
					compilerOptions: {
						experimental: { async: true },
						runes: ({ filename }) =>
							filename.split(/[/\\]/).includes('node_modules') ? undefined : true,
					},
					experimental: { remoteFunctions: true },
					// Old pages still load their chunks, see specs/04-build-output.md
					paths: { relative: false },
					tracing: { server: true },
					version: { name: commitSha },
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
		projects: [
			{
				test: {
					environment: 'node',
					expect: { requireAssertions: true },
					include: ['cli/**/*.{test,spec}.{js,ts}'],
					name: 'cli',
				},
			},
			{
				extends: './vite.config.ts',
				test: {
					environment: 'node',
					expect: { requireAssertions: true },
					include: ['src/**/*.{test,spec}.{js,ts}'],
					name: 'server',
				},
			},
		],
	},
});
