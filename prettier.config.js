/** @type {import("prettier").Config} */
const config = {
	useTabs: true,
	singleQuote: true,
	quoteProps: 'consistent',
	trailingComma: 'all',
	printWidth: 100,
	plugins: ['prettier-plugin-svelte', 'prettier-plugin-tailwindcss'],
	overrides: [
		// See https://github.com/zed-industries/zed/issues/45446
		{ files: 'tsconfig*.json', options: { parser: 'jsonc' } },
		{ files: '*.md', options: { useTabs: false, tabWidth: 2 } },
		{ files: '*.svelte', options: { parser: 'svelte' } },
	],
	tailwindStylesheet: './src/routes/+layout.css',
};

export default config;
