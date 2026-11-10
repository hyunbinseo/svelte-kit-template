<script lang="ts">
	import { getCurrentUser } from '#routes/(user)/remote.ts';
	import { SITE_NAME } from '$app/env/public';

	const user = $derived(await getCurrentUser());
</script>

<svelte:head>
	<title>내 계정 - {SITE_NAME}</title>
</svelte:head>

<main class="page-content">
	<div class="page-card space-y-6">
		<h1 class="text-xl font-bold">내 계정</h1>
		<dl class="space-y-1">
			<dt class="text-sm text-stone-600">이메일</dt>
			<dd>{user.contact}</dd>
		</dl>
	</div>
</main>
