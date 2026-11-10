<script lang="ts">
	import { SITE_NAME } from '$app/env/public';
	import { resolve } from '$app/paths';
	import { page } from '$app/state';

	// By status, not page.error.message: SvelteKit's own messages are English (`Not Found`,
	// `Internal Error`, and `Error: 403` from error() without a message).
	// See https://github.com/sveltejs/kit/issues/11633
	const title = $derived.by(() => {
		const status = page.status;
		if (status === 400) return '잘못된 요청';
		if (status === 401) return '로그인 필요';
		if (status === 403) return '접근 권한 없음';
		if (status === 404) return '찾을 수 없음';
		if (status >= 500) return '서버 오류';
		return '요청 오류';
	});
</script>

<svelte:head>
	<title>{title} - {SITE_NAME}</title>
</svelte:head>

<main class="page-content">
	<div class="page-card space-y-6">
		<h1 class="text-xl font-bold">{title}</h1>
		<div class="flex flex-col gap-2">
			{#if page.status === 401}
				{const returnTo = $derived(encodeURIComponent(page.url.pathname + page.url.search))}
				<a class="btn btn-primary text-center" href={resolve(`login?returnTo=${returnTo}`)}>
					로그인
				</a>
			{:else if page.status >= 500}
				<!-- Clears cached state that may cause the error, then goes home -->
				<form class="contents" action={resolve('clear-site-data')} method="POST">
					<button class="btn btn-primary">초기화하고 처음으로</button>
				</form>
			{/if}
			<a class="btn btn-secondary text-center" href={resolve('')}>처음으로</a>
		</div>
	</div>
</main>
