import { resolve } from 'node:path';
import js from '@eslint/js';
import perfectionist from 'eslint-plugin-perfectionist';
import svelte from 'eslint-plugin-svelte';
import { defineConfig, includeIgnoreFile } from 'eslint/config';
import ts from 'typescript-eslint';

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
		files: ['src/db/*/server/schema/*.ts'],
		ignores: ['**/*.*.ts'],
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
