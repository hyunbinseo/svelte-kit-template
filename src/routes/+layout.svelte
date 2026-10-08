<script lang="ts">
	import { SITE_NAME } from '$app/env/public';
	import { beforeNavigate } from '$app/navigation';
	import { page, updated } from '$app/state';
	import { slide } from 'svelte/transition';
	import { setClientContext, type Client } from '#lib/context.ts';
	import './layout.css';

	let { children } = $props();

	const client = $state<Client>({});
	setClientContext(client);

	beforeNavigate(({ willUnload, to }) => {
		if (updated.current && !willUnload && to?.url) location.href = to.url.href;
	});
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

<noscript class="block bg-yellow-300 p-2.5 text-center font-semibold">
	자바스크립트를 사용할 수 없습니다.
</noscript>

{@render children()}

<div
	class="pointer-events-none fixed inset-x-4 bottom-4 z-50 mx-auto flex w-fit flex-col items-center *:pointer-events-auto *:mt-2"
	role="status"
>
	{#if client.online === false}
		<p class="toast" transition:slide>인터넷에 연결되어 있지 않습니다.</p>
	{/if}
	{#if updated.current}
		<p class="flex items-center gap-x-4 toast pr-2" transition:slide>
			새 버전이 있습니다.
			<button
				class="btn btn-secondary"
				disabled={client.online === false}
				onclick={() => location.reload()}
			>
				새로고침
			</button>
		</p>
	{/if}
</div>
