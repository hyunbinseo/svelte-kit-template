<script lang="ts">
	import { logout } from '#lib/auth/logout.remote.ts';
	import { getAccount } from '#routes/account/remote.ts';
	import { SITE_NAME } from '$app/env/public';

	const account = $derived(await getAccount());
</script>

<svelte:head>
	<title>내 계정 - {SITE_NAME}</title>
</svelte:head>

<main class="page-container">
	<div class="page-card space-y-6">
		<h1 class="text-xl font-bold">내 계정</h1>
		<p>{account.contact}</p>
		<form {...logout}>
			<button class="btn w-full btn-secondary disabled:btn-busy" disabled={!!logout.pending}>
				로그아웃
			</button>
		</form>
	</div>
</main>
