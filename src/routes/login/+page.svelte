<script lang="ts">
	import { formIssues } from '$lib/components/FormIssues.svelte';
	import StyledLabels from '$lib/components/StyledLabels.svelte';
	import { CODE_LENGTH } from '$lib/config';
	import { CODE_BLOCKED, CODE_EXPIRED, PublicSendCodeSchema, PublicValidateCodeSchema } from '.';
	import { sendCode as _sendCode } from './send.remote';
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

<main
	class="flex min-h-svh bg-cover bg-center py-16"
	style:background-image="url('https://images.unsplash.com/photo-1761880674035-125e9fd849fb?q=80&w=2340&auto=format')"
>
	<div class="m-auto w-full max-w-sm bg-white/90 px-6 py-8 backdrop-blur">
		<h1 class="text-2xl font-bold">로그인</h1>
		<StyledLabels>
			{#if !sendCode.result || validateResult?.success === false}
				{#if validateResult}
					{@const message = { CODE_BLOCKED, CODE_EXPIRED }[validateResult.code]}
					<p class="mt-1 text-red-600">{message}</p>
				{/if}
				<form
					{...sendCode.preflight(PublicSendCodeSchema)}
					onchange={() => sendCode.validate({ preflightOnly: true })}
					class="mt-4 flex flex-col gap-y-4"
				>
					<fieldset
						disabled={!!sendCode.pending}
						class="contents"
					>
						<label>
							<span>이메일</span>
							<input
								{...sendCode.fields.contact.as('email')}
								placeholder="username@example.com"
								autocomplete="email"
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
					class="mt-4 flex flex-col gap-y-4"
				>
					<fieldset
						disabled={!!validateCode.pending}
						class="contents"
					>
						<input {...validateCode.fields.id.as('hidden', sendCode.result.id)} />
						<input {...validateCode.fields.contact.as('hidden', sendCode.result.contact)} />
						<label>
							<span>이메일</span>
							<input
								disabled
								type="email"
								value={sendCode.result.contact}
								class="bg-gray-200"
							/>
						</label>
						<label>
							<span>인증번호</span>
							<!-- svelte-ignore a11y_autofocus -->
							<input
								{...validateCode.fields.code.as('text')}
								placeholder={'0'.repeat(CODE_LENGTH)}
								inputmode="numeric"
								autocomplete="one-time-code"
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
	</div>
</main>
