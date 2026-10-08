<script lang="ts">
	import { browser } from '$app/env';
	import { resolve } from '$app/paths';
	import { isLoggedIn } from './session.remote.ts';

	let { data } = $props();
</script>

<div class="page-container">
	<main class="page-card">
		<h1 class="font-bold">{data.title}</h1>
		<nav class="mt-4 flex gap-x-4">
			{#if browser && (await isLoggedIn())}
				<a class="btn btn-primary" href={resolve('app')}>내 정보</a>
			{:else}
				<a class="btn btn-primary" href={resolve('login')}>로그인</a>
			{/if}
		</nav>
	</main>
</div>
