<script lang="ts">
	import suitVariableWoff2 from '@sun-typeface/suit/fonts/variable/woff2/SUIT-Variable.woff2?url';
	import { checkBrowserScript } from '.';
	import '../app.css';

	let { children } = $props();
</script>

<svelte:head>
	<!-- eslint-disable-next-line svelte/no-at-html-tags -->
	{@html checkBrowserScript}
	<link
		rel="preload"
		href={suitVariableWoff2}
		as="font"
		type="font/woff2"
		crossorigin="anonymous"
	/>
</svelte:head>

{@render children?.()}
