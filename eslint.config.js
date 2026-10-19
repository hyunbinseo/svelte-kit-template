import { resolve } from 'node:path';
import js from '@eslint/js';
import svelte from 'eslint-plugin-svelte';
import { defineConfig, includeIgnoreFile } from 'eslint/config';
import ts from 'typescript-eslint';

export default defineConfig(
	includeIgnoreFile(resolve(import.meta.dirname, '.gitignore')),
	js.configs.recommended,
	ts.configs.recommended,
	svelte.configs.recommended,
	{ rules: { 'no-undef': 'off' } },
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
		files: ['**/*.{cjs,cts,mjs,mts}'],
		rules: {
			'no-restricted-syntax': [
				'error',
				{ message: 'Use .js or .ts instead.', selector: 'Program' },
			],
		},
	},
);
