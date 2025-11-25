<script lang="ts">
	import '$lib/layout.css';
	import suitVariableWoff2 from '@sun-typeface/suit/fonts/variable/woff2/SUIT-Variable.woff2?url';
	import { slide } from 'svelte/transition';
	import { checkBrowserScript } from '.';
	import { setAppState, type AppState } from './context';

	let { children } = $props();

	// Reference https://svelte.dev/docs/svelte/context
	let app = $state<AppState>({ isOnline: undefined });
	setAppState(app);
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

<svelte:window bind:online={app.isOnline} />

<noscript>자바스크립트를 사용할 수 없습니다.</noscript>

{#if app.isOnline === false}
	<p transition:slide>인터넷에 연결되어 있지 않습니다.</p>
{/if}

{@render children()}

<style>
	noscript,
	p {
		display: block;
		background-color: var(--color-yellow-300);
		padding: calc(var(--spacing) * 2.5);
		font-weight: var(--font-weight-semibold);
		text-align: center;
	}
</style>
