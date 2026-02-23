import { sveltekit } from '@sveltejs/kit/vite';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vite';

export default defineConfig({
	build: { target: 'es2023' },
	plugins: [tailwindcss(), sveltekit()],
	server: {
		port: 5263,
		strictPort: true,
	},
});

// vite@7 roughly requires ES2023.
//
// | Browser | vite@7 | ES2023 |
// | ------- | ------ | ------ |
// | Chrome  | 107    | 110    |
// | Safari  | 16     | 16.4   |
// | Firefox | 104    | 115\*  |
//
// See https://caniuse.com/sr-es14
// See https://vite.dev/guide/build.html
