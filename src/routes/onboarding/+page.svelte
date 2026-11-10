<script lang="ts">
	import FieldIssues from '#lib/components/FieldIssues.svelte';
	import StyledForm from '#lib/components/StyledForm.svelte';
	import { onboard } from '#routes/onboarding/remote.ts';
	import { SITE_NAME } from '$app/env/public';
	import { page } from '$app/state';

	const returnTo = $derived(page.url.searchParams.get('returnTo') ?? '');
</script>

<svelte:head>
	<title>가입 - {SITE_NAME}</title>
</svelte:head>

<main class="page-content">
	<div class="page-card space-y-6">
		<h1 class="text-xl font-bold">가입</h1>

		<StyledForm {...onboard} class="space-y-2">
			<input {...onboard.fields.returnTo.as('hidden', returnTo)} />
			<label>
				<span>생년월일</span>
				<input {...onboard.fields.birthDate.as('date')} required />
			</label>
			<FieldIssues issues={onboard.fields.birthDate.issues()} />
			<button class="btn w-full btn-primary disabled:btn-busy" disabled={!!onboard.pending}>
				시작하기
			</button>
		</StyledForm>
	</div>
</main>
