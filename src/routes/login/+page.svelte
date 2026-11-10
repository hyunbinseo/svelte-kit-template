<script lang="ts">
	import FieldIssues from '#lib/components/FieldIssues.svelte';
	import StyledForm from '#lib/components/StyledForm.svelte';
	import { sendCode, verifyCode } from '#routes/login/remote.ts';
	import { SITE_NAME } from '$app/env/public';
	import { page } from '$app/state';
	import type { PageProps } from './$types.ts';

	let { data }: PageProps = $props();

	const returnTo = $derived(page.url.searchParams.get('returnTo') ?? '');
</script>

<svelte:head>
	<title>로그인 - {SITE_NAME}</title>
</svelte:head>

<main class="page-content">
	<div class="page-card space-y-6">
		<h1 class="text-xl font-bold">로그인</h1>

		<StyledForm {...sendCode} class="space-y-2">
			<label>
				<span>이메일</span>
				<input {...sendCode.fields.contact.as('email')} autocomplete="email" required />
			</label>
			<FieldIssues issues={sendCode.fields.contact.issues()} />
			<button class="btn w-full btn-secondary disabled:btn-busy" disabled={!!sendCode.pending}>
				인증번호 받기
			</button>
		</StyledForm>

		{#if data.hasPendingLogin}
			<StyledForm {...verifyCode} class="space-y-2">
				<input {...verifyCode.fields.returnTo.as('hidden', returnTo)} />
				<label>
					<span>인증번호</span>
					<input
						{...verifyCode.fields.code.as('text')}
						autocomplete="one-time-code"
						inputmode="numeric"
						required
					/>
				</label>
				<FieldIssues issues={verifyCode.fields.code.issues()} />
				<button class="btn w-full btn-primary disabled:btn-busy" disabled={!!verifyCode.pending}>
					로그인
				</button>
			</StyledForm>
		{/if}
	</div>
</main>
