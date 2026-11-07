<script lang="ts">
	import { resolve } from '$app/paths';
	import { page } from '$app/state';

	// Minimal until specs/09-app-shell.md
	const loginSearch = $derived(
		new URLSearchParams({ returnTo: page.url.pathname + page.url.search }),
	);
</script>

<main class="page-container">
	<div class="page-card space-y-6">
		<h1 class="text-xl font-bold">{page.status}</h1>
		<p>{page.error?.message}</p>
		{#if page.status === 401}
			<a class="btn btn-primary" href={resolve(`/login?${loginSearch}`)}>로그인</a>
		{:else if page.status >= 500}
			<form action={resolve('/clear-site-data')} method="POST">
				<button class="btn btn-secondary">초기화</button>
			</form>
		{/if}
	</div>
</main>
