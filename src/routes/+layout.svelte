<script lang="ts">
	import { SITE_NAME } from '$app/env/public';
	import { page } from '$app/state';
	import { slide } from 'svelte/transition';
	import { setClientContext, type Client } from '#lib/context.ts';
	import './+layout.css';

	let { children } = $props();

	const client = $state<Client>({});
	setClientContext(client);
</script>

<svelte:head>
	<title>
		{page.data.title //
			? `${page.data.title} - ${SITE_NAME}`
			: SITE_NAME}
	</title>
	<meta name="robots" content={page.data.robots ?? 'noindex, nofollow'} />
</svelte:head>

<svelte:window bind:online={client.online} />

<noscript>자바스크립트를 사용할 수 없습니다.</noscript>

{#if client.online === false}
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
