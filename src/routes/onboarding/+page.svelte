<script lang="ts">
	import { onboard } from '#routes/onboarding/remote.ts';
	import { SITE_NAME } from '$app/env/public';
	import { page } from '$app/state';

	const returnTo = $derived(page.url.searchParams.get('returnTo') ?? '');
</script>

<svelte:head>
	<title>가입 - {SITE_NAME}</title>
</svelte:head>

<main class="page-container">
	<div class="page-card space-y-6">
		<h1 class="text-xl font-bold">가입</h1>

		<form {...onboard} class="space-y-2">
			<input {...onboard.fields.returnTo.as('hidden', returnTo)} />
			<label class="block">
				<span>생년월일</span>
				<input
					{...onboard.fields.birthDate.as('date')}
					class="mt-1 block w-full rounded"
					required
				/>
			</label>
			{#each onboard.fields.birthDate.issues() ?? [] as issue (issue.message)}
				<p class="text-sm text-red-700">{issue.message}</p>
			{/each}
			<button class="btn w-full btn-primary disabled:btn-busy" disabled={!!onboard.pending}>
				시작하기
			</button>
		</form>
	</div>
</main>
