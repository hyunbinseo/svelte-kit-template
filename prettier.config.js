/** @type {import("prettier").Config} */
const config = {
	overrides: [{ files: '*.svelte', options: { parser: 'svelte' } }],
	plugins: ['prettier-plugin-svelte', 'prettier-plugin-tailwindcss'],
	printWidth: 100,
	quoteProps: 'consistent',
	singleQuote: true,
	tailwindStylesheet: './src/routes/+layout.css',
	trailingComma: 'all',
	useTabs: true,
};

export default config;
