<script lang="ts">
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

<main class="page-container">
	<div class="page-card space-y-6">
		<h1 class="text-xl font-bold">로그인</h1>

		<form {...sendCode} class="space-y-2">
			<label class="block">
				<span>이메일</span>
				<input
					{...sendCode.fields.contact.as('email')}
					autocomplete="email"
					class="mt-1 block w-full rounded"
					required
				/>
			</label>
			{#each sendCode.fields.contact.issues() ?? [] as issue (issue.message)}
				<p class="text-sm text-red-700">{issue.message}</p>
			{/each}
			<button class="btn w-full btn-secondary disabled:btn-busy" disabled={!!sendCode.pending}>
				인증번호 받기
			</button>
		</form>

		{#if data.hasPendingLogin}
			<form {...verifyCode} class="space-y-2">
				<input {...verifyCode.fields.returnTo.as('hidden', returnTo)} />
				<label class="block">
					<span>인증번호</span>
					<input
						{...verifyCode.fields.code.as('text')}
						autocomplete="one-time-code"
						class="mt-1 block w-full rounded"
						inputmode="numeric"
						required
					/>
				</label>
				{#each verifyCode.fields.code.issues() ?? [] as issue (issue.message)}
					<p class="text-sm text-red-700">{issue.message}</p>
				{/each}
				<button class="btn w-full btn-primary disabled:btn-busy" disabled={!!verifyCode.pending}>
					로그인
				</button>
			</form>
		{/if}
	</div>
</main>
