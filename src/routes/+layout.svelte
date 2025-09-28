<script lang="ts">
	import suitVariableWoff2 from '@sun-typeface/suit/fonts/variable/woff2/SUIT-Variable.woff2?url';
	import '../app.css';

	let { children } = $props();
</script>

<svelte:head>
	<link rel="preload" href={suitVariableWoff2} as="font" type="font/woff2" />
</svelte:head>

{@render children?.()}
