<script lang="ts">
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
</script>

<main class="p-8">
	<code>HTTP {page.status}</code>
	<h1 class="text-xl font-bold">
		{#if page.status === 401}
			인증 정보가 없습니다.<br />
			재접속해 주시기 바랍니다.
		{:else if page.status === 403}
			접근 권한이 없습니다.<br />
			재접속해 주시기 바랍니다.
		{:else if page.status === 404}
			페이지를 찾을 수 없습니다.
		{:else if page.error?.message}
			{page.error.message}
		{:else}
			알 수 없는 오류가 발생했습니다.
		{/if}
	</h1>
	<nav class="mt-4 flex gap-x-4">
		<a href={resolve('/')} class="btn btn-primary">처음으로</a>
		{#if page.status >= 500}
			<form method="POST" class="contents">
				<button formaction={resolve('/api/clear-site-data')} class="btn btn-primary">
					초기화 후 처음으로
				</button>
			</form>
		{/if}
	</nav>
</main>
