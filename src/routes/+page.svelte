<script lang="ts">
	import { onMount } from 'svelte';
	import { getIsLoggedIn } from '#routes/remote.ts';
	import { SITE_NAME } from '$app/env/public';
	import { resolve } from '$app/paths';

	// Prerendered as logged out; the same button switches once the session is known.
	let isLoggedIn = $state(false);

	// The account page sends a user who isn't onboarded to onboarding.
	onMount(async () => {
		isLoggedIn = await getIsLoggedIn();
	});
</script>

<svelte:head>
	<title>{SITE_NAME}</title>
</svelte:head>

<main class="page-content">
	<div class="page-card space-y-6">
		<h1 class="text-xl font-bold">{SITE_NAME}</h1>
		<a
			class="btn w-full btn-primary text-center"
			href={isLoggedIn ? resolve('account') : resolve('login')}
		>
			{isLoggedIn ? '내 계정' : '로그인'}
		</a>
	</div>
</main>
