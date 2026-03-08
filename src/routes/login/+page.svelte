<script lang="ts">
	import { formIssues } from '$lib/components/FormIssues.svelte';
	import StyledLabels from '$lib/components/StyledLabels.svelte';
	import { SITE_NAME } from '$lib/config';
	import { PublicSendCodeSchema, sendCodeAttributes } from './send';
	import { sendCode as _sendCode } from './send.remote';
	import { CODE_BLOCKED, CODE_EXPIRED } from './shared';
	import { PublicValidateCodeSchema, validateCodeAttributes } from './validate';
	import { validateCode as _validateCode } from './validate.remote';

	const uid = $props.id();

	// NOTE Previous attempt persists on logout redirect
	// See https://github.com/sveltejs/kit/issues/14802
	const sendCode = _sendCode.for(uid);
	const validateCode = _validateCode.for(uid);

	// NOTE Cannot programmatically reset form results
	// See https://github.com/sveltejs/kit/pull/14779
	let validateResult = $derived(validateCode.result);

	$effect(() => {
		if (sendCode.result) validateResult = undefined;
	});
</script>

<div
	class="flex h-svh overflow-y-auto bg-cover bg-center xs:py-16"
	style:background-image="url('https://images.unsplash.com/photo-1761880674035-125e9fd849fb?q=80&w=2340&auto=format')"
>
	<main
		class="m-auto mt-0 w-full bg-white/90 px-6 py-8 backdrop-blur xs:mt-auto xs:w-sm xs:rounded-lg"
	>
		<header>
			<p class="text-sm text-gray-600">{SITE_NAME}</p>
			<h1 class="text-2xl font-bold">로그인</h1>
		</header>
		<StyledLabels>
			{#if !sendCode.result || validateResult?.success === false}
				{#if validateResult}
					{@const message = { CODE_BLOCKED, CODE_EXPIRED }[validateResult.code]}
					<p class="mt-1 text-red-600">{message}</p>
				{/if}
				<form
					{...sendCode.preflight(PublicSendCodeSchema)}
					onchange={() => sendCode.validate({ preflightOnly: true })}
					class="mt-6 flex flex-col gap-y-4"
				>
					<fieldset disabled={!!sendCode.pending} class="contents">
						<label>
							<span>이메일</span>
							<!-- NOTE Virtual keyboard might not open despite autofocus (e.g. no prior user interaction) -->
							<!-- svelte-ignore a11y_autofocus -->
							<input
								{...sendCode.fields.contact.as('email')}
								{...sendCodeAttributes.contact}
								autofocus
							/>
							{@render formIssues(sendCode.fields.contact.issues())}
						</label>
						<button class="btn btn-primary disabled:btn-busy">인증번호 전송</button>
					</fieldset>
				</form>
			{:else}
				<form
					{...validateCode.preflight(PublicValidateCodeSchema)}
					onchange={() => validateCode.validate({ preflightOnly: true })}
					class="mt-6 flex flex-col gap-y-4"
				>
					<fieldset disabled={!!validateCode.pending} class="contents">
						<input
							{...validateCode.fields.id.as('hidden', sendCode.result.id)}
							{...validateCodeAttributes.id}
						/>
						<input
							{...validateCode.fields.contact.as('hidden', sendCode.result.contact)}
							{...validateCodeAttributes.contact}
						/>
						<label>
							<span>이메일</span>
							<input disabled type="email" value={sendCode.result.contact} class="bg-gray-200" />
						</label>
						<label>
							<span>인증번호</span>
							<!-- svelte-ignore a11y_autofocus -->
							<input
								{...validateCode.fields.code.as('text')}
								{...validateCodeAttributes.code}
								autofocus
								class="tabular-nums"
							/>
							{@render formIssues(validateCode.fields.code.issues())}
						</label>
						<button class="btn btn-primary disabled:btn-busy">로그인</button>
					</fieldset>
				</form>
			{/if}
		</StyledLabels>
	</main>
</div>
