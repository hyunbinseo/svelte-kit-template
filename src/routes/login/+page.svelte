<script lang="ts">
	import { SITE_NAME } from '$app/env/public';
	import { formIssues } from '#lib/components/FormIssues.svelte';
	import StyledLabels from '#lib/components/StyledLabels.svelte';
	import { AUTH_CODE_LENGTH } from '#lib/config.ts';
	import { PLACEHOLDER_EMAIL } from '#lib/placeholders.ts';
	import { sendCode as _sendCode } from './send.remote.ts';
	import { SendCodeSchema } from './send.ts';
	import { CODE_BLOCKED, CODE_EXPIRED, IP_MISMATCH } from './shared.ts';
	import { validateCode as _validateCode } from './validate.remote.ts';
	import { ValidateCodeSchema } from './validate.ts';

	let { data } = $props();
	const uid = $props.id();

	// Reset remote form state after navigation.
	// See https://github.com/sveltejs/kit/issues/14802
	const sendCode = _sendCode.for(uid);
	const validateCode = _validateCode.for(uid);

	// BLOCKED Programmatically reset remote form state.
	// See https://github.com/sveltejs/kit/pull/14779
	let validateResult = $derived(validateCode.result);

	$effect(() => {
		if (sendCode.result) validateResult = undefined;
	});
</script>

<div class="page-container">
	<main class="w-full page-card xs:w-sm">
		<header class="mt-2">
			<p class="text-sm text-gray-600">{SITE_NAME}</p>
			<h1 class="text-2xl font-bold">{data.title}</h1>
		</header>
		<StyledLabels>
			{#if !sendCode.result || validateResult?.success === false}
				{#if validateResult}
					<p class="mt-1 text-red-600">
						{{
							CODE_BLOCKED,
							CODE_EXPIRED,
							IP_MISMATCH,
						}[validateResult.code]}
					</p>
				{/if}
				<form
					{...sendCode.preflight(SendCodeSchema)}
					class="mt-6 flex flex-col gap-y-4"
					onchange={() => sendCode.validate({ preflightOnly: true })}
				>
					<!-- BLOCKED Use top-level fieldset to disable form during submission. -->
					<!-- See https://github.com/sveltejs/kit/issues/15104 -->
					<fieldset class="contents" disabled={false}>
						<label>
							<span>이메일</span>
							<!-- Virtual keyboard might not open despite autofocus (e.g. no prior user interaction). -->
							<!-- svelte-ignore a11y_autofocus -->
							<input
								{...sendCode.fields.contact.as('email')}
								autocomplete="email"
								autofocus
								placeholder={PLACEHOLDER_EMAIL}
							/>
							{@render formIssues(sendCode.fields.contact.issues())}
						</label>
						<button class="btn btn-primary disabled:btn-busy" disabled={!!sendCode.pending}>
							인증번호 전송
						</button>
					</fieldset>
				</form>
			{:else}
				<form
					{...validateCode.preflight(ValidateCodeSchema)}
					class="mt-6 flex flex-col gap-y-4"
					onchange={() => validateCode.validate({ preflightOnly: true })}
				>
					<fieldset class="contents" disabled={false}>
						<input {...validateCode.fields.id.as('hidden', sendCode.result.id)} />
						<input {...validateCode.fields.contact.as('hidden', sendCode.result.contact)} />
						<label>
							<span>이메일</span>
							<input class="bg-gray-200" disabled type="email" value={sendCode.result.contact} />
						</label>
						<label>
							<span>인증번호</span>
							<!-- svelte-ignore a11y_autofocus -->
							<input
								{...validateCode.fields.code.as('text')}
								class="tabular-nums"
								autocomplete="one-time-code"
								autofocus
								inputmode="numeric"
								placeholder={'0'.repeat(AUTH_CODE_LENGTH)}
							/>
							{@render formIssues(validateCode.fields.code.issues())}
						</label>
						<button class="btn btn-primary disabled:btn-busy" disabled={!!validateCode.pending}>
							로그인
						</button>
					</fieldset>
				</form>
			{/if}
		</StyledLabels>
	</main>
</div>
