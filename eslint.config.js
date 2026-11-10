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
		'cli/lib/*',
	],
};

// CLI-only procedures mirror src/db, see specs/06-query-layer.md
const procedureModuleGlobs = [
	'cli/db/*/*/procedures.{js,ts}',
	'src/db/server/*/*/procedures.{js,ts}',
];

const testModuleGlobs = ['**/*.{test,spec}.{js,ts}']; // as in vite.config.ts
const e2eModuleGlobs = ['**/*.e2e.{js,ts}']; // as in playwright.config.ts

const restrictedImports = {
	paths: [
		{ message: 'Use node:assert/strict.', name: 'assert' },
		{ message: 'Use node:assert/strict.', name: 'node:assert' },
		{ message: 'Use vite-plus/test.', name: 'vitest' },
		{
			importNames: ['default', 'expect', 'test'],
			message: 'Use #tests/fixtures.ts.',
			name: '@playwright/test',
		},
	],
	patterns: [
		{
			// SvelteKit resolves ./$types through rootDirs.
			group: ['./*', '../*', '!./$types.ts'],
			message: 'Use a subpath import.',
		},
		{ group: ['vitest/*', '@vitest/*'], message: 'Use vite-plus/test.' },
	],
};

// Escaped: gitignore syntax reads a leading # as a comment.
const e2eOnlyPattern = { group: [String.raw`\#tests/*`], message: 'E2E only.' };

// Tests assert with expect, which requireAssertions counts; ok only narrows.
const testImportPaths = [
	{
		allowImportNames: ['AssertionError', 'ok'],
		message: 'Use expect.',
		name: 'node:assert/strict',
	},
	{ importNames: ['assert'], message: 'Use expect, or ok to narrow.', name: 'vite-plus/test' },
];

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
		files: ['cli/**'],
		rules: {
			'no-restricted-imports': [
				'error',
				{ ...restrictedImports, patterns: [...restrictedImports.patterns, e2eOnlyPattern] },
			],
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
						e2eOnlyPattern,
						// Escaped: gitignore syntax reads a leading # as a comment.
						{ group: [String.raw`\#cli/*`], message: 'Move shared code to src/.' },
					],
				},
			],
		},
	},
	{
		// The typescript-eslint rule, so the bans above still apply. No other block sets it for tests.
		files: [...testModuleGlobs, ...e2eModuleGlobs],
		rules: { '@typescript-eslint/no-restricted-imports': ['error', { paths: testImportPaths }] },
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
		rules: {
			'no-restricted-syntax': [
				'error',
				'ImportNamespaceSpecifier',
				{ message: 'Use a declaration tag ({const …}).', selector: 'SvelteConstTag' },
			],
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
