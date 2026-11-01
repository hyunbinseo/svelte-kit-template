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

const procedureModuleGlob = 'src/db/*/server/*/procedures.{js,ts}';
const testModuleGlob = '**/*.{test,spec}.{js,ts}'; // as in vite.config.ts

export default defineConfig(
	includeIgnoreFile(resolve(import.meta.dirname, '.gitignore')),
	js.configs.recommended,
	ts.configs.recommended,
	svelte.configs.recommended,
	perfectionist.configs['recommended-natural'],
	{
		rules: {
			'func-style': ['error', 'expression'],
			'no-restricted-imports': [
				'error',
				{
					paths: [
						{ message: 'Use node:assert/strict.', name: 'assert' },
						{ message: 'Use node:assert/strict.', name: 'node:assert' },
					],
					patterns: [
						{
							group: ['../*', './*/**'],
							message: 'Use a subpath import.',
						},
					],
				},
			],
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
		files: ['src/db/**/*.ts'],
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
		files: [...svelteKitServerModuleGlobs, procedureModuleGlob],
		ignores: [testModuleGlob],
		rules: {
			'@typescript-eslint/no-restricted-imports': [
				'error',
				{
					patterns: [
						{
							allowTypeImports: true,
							// Escaped: gitignore syntax reads a leading # as a comment.
							group: [
								String.raw`\#db/*/server/schema.ts`,
								String.raw`\#db/*/server/*/schema.ts`,
								String.raw`\#db/*/server/*/schema/*`,
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
		files: svelteKitServerModuleGlobs,
		ignores: [testModuleGlob],
		rules: {
			'no-restricted-properties': [
				'error',
				{ message: 'Bind values instead.', object: 'sql', property: 'raw' },
				{ message: 'Move queries to a query file.', object: 'db' }, // db.query and db.run need no import
			],
		},
	},
	{
		files: [procedureModuleGlob],
		ignores: [testModuleGlob],
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
		files: ['src/db/*/server/*/schema.ts'],
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
