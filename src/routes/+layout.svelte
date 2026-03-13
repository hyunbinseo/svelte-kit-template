<script lang="ts">
	import { page } from '$app/state';
	import { SITE_NAME } from '$lib/config.ts';
	import { slide } from 'svelte/transition';
	import './+layout.css';
	import { checkBrowserScript } from './index.ts';

	let { children } = $props();

	let isOnline = $state<boolean>();
</script>

<svelte:head>
	<title>
		{page.data.title //
			? `${page.data.title} - ${SITE_NAME}`
			: SITE_NAME}
	</title>
	<!-- eslint-disable-next-line svelte/no-at-html-tags -->
	{@html checkBrowserScript}
</svelte:head>

<svelte:window bind:online={isOnline} />

<noscript>자바스크립트를 사용할 수 없습니다.</noscript>

{#if isOnline === false}
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
