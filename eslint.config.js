import { resolve } from 'node:path';
import js from '@eslint/js';
import prettier from 'eslint-config-prettier';
import perfectionist from 'eslint-plugin-perfectionist';
import svelte from 'eslint-plugin-svelte';
import { defineConfig, includeIgnoreFile } from 'eslint/config';
import globals from 'globals';
import ts from 'typescript-eslint';

const drizzleKeys = [
	'orderBy',
	'limit',
	'offset',
	'from',
	'to',
	'target',
	'where',
	'targetWhere',
	'set',
	'setWhere',
	'optional',
	'alias',
	'columns',
	'extras',
	'with',
];

const drizzleSelector = [
	'CallExpression[callee.property.name=/^(findMany|findFirst|onConflictDoNothing|onConflictDoUpdate)$/] > ObjectExpression',
	'CallExpression[callee.name="defineRelations"] CallExpression[callee.object.property.name=/^(one|many)$/] > ObjectExpression',
	'CallExpression[callee.name="defineRelations"] CallExpression[callee.object.name=/^(one|many)$/] > ObjectExpression',
	'CallExpression[callee.property.name=/^(findMany|findFirst)$/] Property[key.name="with"] > ObjectExpression > Property > ObjectExpression',
].join(', ');

export default defineConfig(
	includeIgnoreFile(resolve(import.meta.dirname, '.gitignore')),
	js.configs.recommended,
	ts.configs.recommended,
	svelte.configs.recommended,
	prettier,
	svelte.configs.prettier,
	{
		plugins: { perfectionist },
		languageOptions: { globals: { ...globals.browser, ...globals.node } },
		rules: {
			'no-undef': 'off',
			'perfectionist/sort-objects': [
				'error',
				{
					useConfigurationIf: { matchesAstSelector: drizzleSelector },
					type: 'unsorted',
					customGroups: drizzleKeys.map((key) => ({
						groupName: key,
						elementNamePattern: `^${key}$`,
					})),
					groups: drizzleKeys,
				},
				{ type: 'unsorted' },
			],
			'no-restricted-imports': [
				'error',
				'assert',
				'node:assert',
				'node:test',
				'vitest',
				{
					name: '@playwright/test',
					importNames: ['test'],
					message: 'Import the custom `test` fixture instead.',
				},
			],
		},
	},
	{
		files: ['**/*.test.ts', '**/*.e2e.ts'],
		rules: {
			'no-restricted-syntax': [
				'error',
				{
					selector: 'ImportSpecifier[imported.name=/^(vi|vitest|jest|mock)$/]',
					message: 'Use real dependencies for I/O tests and explicit input values for pure tests.',
				},
				{
					selector:
						'CallExpression[callee.property.name=/^(mock|doMock|spyOn|useFakeTimers|setSystemTime|stubGlobal|stubEnv|route|routeFromHAR)$/]',
					message: 'Do not replace I/O, clocks, or network responses in tests.',
				},
			],
		},
	},
	{
		files: ['**/*.svelte', '**/*.svelte.ts', '**/*.svelte.js'],
		languageOptions: {
			parserOptions: {
				projectService: true,
				extraFileExtensions: ['.svelte'],
				parser: ts.parser,
			},
		},
		rules: {
			'svelte/sort-attributes': 'error',
		},
	},
	{
		files: ['src/routes/**/server/**'],
		rules: {
			'no-restricted-syntax': [
				'error',
				{
					selector: 'Program',
					message:
						'Rename to `server.ts` or `*.server.ts` — `server/` is not server-only in `src/routes/`.',
				},
			],
		},
	},
);
