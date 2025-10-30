<script lang="ts">
	import suitVariableWoff2 from '@sun-typeface/suit/fonts/variable/woff2/SUIT-Variable.woff2?url';
	import { checkBrowserScript } from '.';
	import '$lib/app.css';
	import { slide } from 'svelte/transition';

	let { children } = $props();

	let isOnline = $state<boolean>();
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

<svelte:window bind:online={isOnline} />

<noscript>자바스크립트를 사용할 수 없습니다.</noscript>

{#if isOnline === false}
	<p transition:slide>인터넷에 연결되어 있지 않습니다.</p>
{/if}

{@render children?.()}

<style>
	noscript,
	p {
		display: block;
		background-color: var(--color-yellow-300);
		padding: calc(var(--spacing) * 4);
		font-weight: var(--font-weight-semibold);
		text-align: center;
	}
</style>
