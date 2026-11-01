import { resolve } from 'node:path';
import js from '@eslint/js';
import perfectionist from 'eslint-plugin-perfectionist';
import svelte from 'eslint-plugin-svelte';
import { defineConfig, includeIgnoreFile } from 'eslint/config';
import ts from 'typescript-eslint';

const svelteKitServerModuleGlobs = [
	'src/**/*.remote.*',
	'src/**/remote.*',
	'src/hooks.server.{js,ts}',
	'src/hooks.server/index.{js,ts}',
	'src/routes/**/+server.{js,ts}',
	'src/routes/**/+{layout,page}{,@*}.server.{js,ts}',
];

// Like SvelteKit server modules
const cliScripts = {
	files: ['cli/**/*.{js,ts}'],
	// Modules scripts import, and files other tools run
	ignores: [
		'cli/canary.ts',
		'cli/db/*/*/queries.{js,ts}',
		'cli/db/client.ts',
		'cli/db/drizzle-kit/*',
		'cli/shared.ts',
	],
};

// CLI-only procedures mirror src/db, see specs/06-query-layer.md
const procedureModuleGlobs = [
	'cli/db/*/*/procedures.{js,ts}',
	'src/db/server/*/*/procedures.{js,ts}',
];

const testModuleGlobs = ['**/*.{test,spec}.{js,ts}']; // as in vite.config.ts

const restrictedImports = {
	paths: [
		{ message: 'Use node:assert/strict.', name: 'assert' },
		{ message: 'Use node:assert/strict.', name: 'node:assert' },
	],
	patterns: [
		{
			// SvelteKit resolves ./$types through rootDirs.
			group: ['./*', '../*', '!./$types.ts'],
			message: 'Use a subpath import.',
		},
	],
};

export default defineConfig(
	includeIgnoreFile(resolve(import.meta.dirname, '.gitignore')),
	js.configs.recommended,
	ts.configs.recommended,
	svelte.configs.recommended,
	perfectionist.configs['recommended-natural'],
	{
		rules: {
			'func-style': ['error', 'expression'],
			'no-restricted-imports': ['error', restrictedImports],
			'no-restricted-properties': [
				'error',
				{ message: 'Bind values instead.', object: 'sql', property: 'raw' },
			],
			'no-restricted-syntax': ['error', 'ImportNamespaceSpecifier'],
			'no-undef': 'off',
			'perfectionist/sort-imports': 'off', // oxfmt
			'prefer-arrow-callback': 'error',
		},
	},
	{
		// CLI-only code stays in cli/, see specs/02-cli-separation.md
		files: ['src/**'],
		rules: {
			'no-restricted-imports': [
				'error',
				{
					...restrictedImports,
					patterns: [
						...restrictedImports.patterns,
						// Escaped: gitignore syntax reads a leading # as a comment.
						{ group: [String.raw`\#cli/*`], message: 'Move shared code to src/.' },
					],
				},
			],
		},
	},
	{
		files: ['**/*.svelte', '**/*.svelte.js', '**/*.svelte.ts'],
		languageOptions: {
			parserOptions: {
				extraFileExtensions: ['.svelte'],
				parser: ts.parser,
				projectService: true,
			},
		},
	},
	{
		files: ['cli/db/*/*/*.ts', 'src/db/**/*.ts'],
		rules: {
			'no-restricted-syntax': [
				'error',
				'ImportNamespaceSpecifier',
				{ message: "Use Drizzle's sync API.", selector: 'AwaitExpression' },
			],
		},
	},
	{
		// Named queries only, see specs/06-query-layer.md
		files: [...svelteKitServerModuleGlobs, ...cliScripts.files, ...procedureModuleGlobs],
		ignores: [...testModuleGlobs, ...cliScripts.ignores],
		rules: {
			'@typescript-eslint/no-restricted-imports': [
				'error',
				{
					patterns: [
						{
							allowTypeImports: true,
							// Escaped: gitignore syntax reads a leading # as a comment.
							group: [
								String.raw`\#db/*/schema.ts`,
								String.raw`\#db/*/*/schema.ts`,
								String.raw`\#db/*/*/schema/*`,
								'drizzle-orm',
								'drizzle-orm/*',
							],
							message: 'Move queries to a query file.',
						},
					],
				},
			],
		},
	},
	{
		// Writes take a tx, so only procedures can run them.
		files: [...svelteKitServerModuleGlobs, ...cliScripts.files],
		ignores: [...testModuleGlobs, ...cliScripts.ignores, ...procedureModuleGlobs],
		rules: {
			'no-restricted-properties': [
				'error',
				{ message: 'Bind values instead.', object: 'sql', property: 'raw' },
				{ message: 'Move queries to a query file.', object: 'db' }, // db.query and db.run need no import
			],
		},
	},
	{
		files: procedureModuleGlobs,
		ignores: testModuleGlobs,
		rules: {
			'no-restricted-properties': [
				'error',
				{ message: 'Bind values instead.', object: 'sql', property: 'raw' },
				{ message: 'Move queries to a query file.', object: 'tx' }, // tx.query and tx.run need no import
				{
					allowProperties: ['transaction'],
					message: 'Move queries to a query file.',
					object: 'db',
				},
			],
		},
	},
	{
		files: ['src/db/server/*/*/schema.ts'],
		rules: { 'perfectionist/sort-objects': 'off' },
	},
	{
		files: ['**/*.{cjs,cts,mjs,mts}'],
		rules: {
			'no-restricted-syntax': [
				'error',
				{ message: 'Use .js or .ts instead.', selector: 'Program' },
			],
		},
	},
);
