<script lang="ts">
	import { beforeNavigate } from '$app/navigation';
	import { page, updated } from '$app/state';
	import type { LayoutProps } from './$types.ts';
	import './layout.css'; // eslint-disable-line no-restricted-imports

	let { children }: LayoutProps = $props();

	let isOnline = $state(true);

	// A full load picks up the new version's code.
	beforeNavigate(({ to, willUnload }) => {
		if (updated.current && !willUnload && to?.url) location.href = to.url.href;
	});
</script>

<svelte:head>
	<!-- One tag: a page's own robots tag could only restrict it further. -->
	<meta name="robots" content={page.data.robots ?? 'noindex, nofollow'} />
</svelte:head>

<svelte:window bind:online={isOnline} />

<div class="page-container">
	{@render children()}
</div>

<div
	class="pointer-events-none fixed inset-x-0 bottom-4 flex flex-col items-center gap-2 px-4 *:pointer-events-auto"
>
	{#if !isOnline}
		<div class="toast" role="status">오프라인 상태입니다.</div>
	{/if}
	{#if updated.current}
		<div class="toast" role="status">
			새 버전이 있습니다.
			<button class="font-bold underline" onclick={() => location.reload()}>새로고침</button>
		</div>
	{/if}
</div>
