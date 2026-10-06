<script lang="ts">
	import { resolve } from '$app/paths';
	import { page } from '$app/state';

	let { children, data, params } = $props();

	const tabs = $derived([
		{
			label: '학생',
			href: resolve('/(private)/care-centers/[careCenterId=uuid]/students', params),
		},
		{
			label: '구성원',
			href: resolve('/(private)/care-centers/[careCenterId=uuid]/members', params),
		},
	]);
</script>

<div class="mx-auto max-w-3xl p-8">
	<a class="text-sm text-gray-600" href={resolve('/(private)/care-centers')}>← 센터 목록</a>
	<h1 class="mt-2 text-2xl font-bold">{data.careCenter.name}</h1>
	<p class="text-sm text-gray-600">{data.careCenter.fullName}</p>
	<nav class="mt-6 flex gap-x-4 border-b">
		{#each tabs as tab (tab.href)}
			<a
				class={[
					'-mb-px border-b-2 px-1 pb-2',
					page.url.pathname === tab.href ? 'border-black font-semibold' : 'border-transparent',
				]}
				href={tab.href}
			>
				{tab.label}
			</a>
		{/each}
	</nav>
	{@render children()}
</div>
