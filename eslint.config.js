import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import js from '@eslint/js';
import vitest from '@vitest/eslint-plugin';
import perfectionist from 'eslint-plugin-perfectionist';
import svelte from 'eslint-plugin-svelte';
import { defineConfig, includeIgnoreFile } from 'eslint/config';
import ts from 'typescript-eslint';

/** @param {string} relativePath */
const includeIgnoreFileIfExists = (relativePath) => {
	const absolutePath = resolve(import.meta.dirname, relativePath);
	return existsSync(absolutePath) ? includeIgnoreFile(absolutePath) : [];
};

export default defineConfig(
	includeIgnoreFileIfExists('.gitignore'),
	includeIgnoreFileIfExists('.git/info/exclude'),
	js.configs.recommended,
	ts.configs.recommendedTypeChecked,
	svelte.configs.recommended,
	perfectionist.configs['recommended-natural'],
	{
		languageOptions: {
			parserOptions: { projectService: { allowDefaultProject: ['*.{cjs,cts,mjs,mts}'] } },
		},
		rules: { 'no-undef': 'off' },
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
		rules: {
			'@typescript-eslint/switch-exhaustiveness-check': 'error',
			'capitalized-comments': 'error',
			'func-style': ['error', 'expression'],
			'no-restricted-imports': [
				'error',
				{
					paths: [
						{ message: 'Use node:assert/strict.', name: 'assert' },
						{ message: 'Use node:assert/strict.', name: 'assert/strict' },
						{ message: 'Use node:assert/strict.', name: 'node:assert' },
						{ message: 'Use vite-plus.', name: 'vite' },
						{ message: 'Use vite-plus/test.', name: 'vitest' },
						{ message: 'Use vite-plus/pack.', name: 'tsdown' },
					],
					patterns: [
						{ group: ['vite/*'], message: 'Use vite-plus.' },
						{
							group: ['vitest/*', '@vitest/*', '!@vitest/eslint-plugin'],
							message: 'Use vite-plus/test.',
						},
						{
							group: ['./*', '../*', '!./$types.ts', '$lib', '$lib/*'],
							message: 'Use a subpath import (#…).',
						},
					],
				},
			],
			'no-restricted-syntax': [
				'error',
				{ message: 'Use named imports.', selector: 'ImportNamespaceSpecifier' },
			],
			// Oxfmt sorts imports.
			'perfectionist/sort-imports': 'off',
			'prefer-arrow-callback': 'error',
			'svelte/no-at-const-tags': 'error',
		},
	},
	{
		files: ['**/*.{test,spec}.{js,ts}'],
		plugins: { vitest },
		rules: {
			...vitest.configs.recommended.rules,
			'vitest/require-top-level-describe': 'error',
		},
		settings: { vitest: { vitestImports: ['vite-plus/test'] } },
	},
);
