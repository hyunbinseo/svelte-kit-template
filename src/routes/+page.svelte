<script lang="ts">
	import { browser } from '$app/env';
	import { resolve } from '$app/paths';
	import { isLoggedIn } from './session.remote.ts';
</script>

<main class="p-8">
	{#if browser && (await isLoggedIn())}
		<a class="btn btn-primary" href={resolve('app')}>내 정보</a>
	{:else}
		<a class="btn btn-primary" href={resolve('login')}>로그인</a>
	{/if}
</main>
