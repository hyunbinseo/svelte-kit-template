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

export default defineConfig(
	includeIgnoreFile(resolve(import.meta.dirname, '.gitignore')),
	js.configs.recommended,
	ts.configs.recommended,
	svelte.configs.recommended,
	prettier,
	svelte.configs.prettier,
	{
		languageOptions: { globals: { ...globals.browser, ...globals.node } },
		rules: {
			'no-undef': 'off',
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
	{
		plugins: { perfectionist },
		rules: {
			'perfectionist/sort-objects': [
				'error',
				{
					useConfigurationIf: {
						matchesAstSelector: [
							'CallExpression[callee.property.name=/^(findMany|findFirst|onConflictDoNothing|onConflictDoUpdate)$/] > ObjectExpression',
							'CallExpression[callee.name="defineRelations"] CallExpression[callee.object.property.name=/^(one|many)$/] > ObjectExpression',
							'CallExpression[callee.name="defineRelations"] CallExpression[callee.object.name=/^(one|many)$/] > ObjectExpression',
							'CallExpression[callee.property.name=/^(findMany|findFirst)$/] Property[key.name="with"] > ObjectExpression > Property > ObjectExpression',
						].join(', '),
					},
					type: 'unsorted',
					customGroups: drizzleKeys.map((key) => ({
						groupName: key,
						elementNamePattern: `^${key}$`,
					})),
					groups: drizzleKeys,
				},
				{ type: 'unsorted' },
			],
		},
	},
);
