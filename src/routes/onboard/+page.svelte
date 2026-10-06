<script lang="ts">
	import { SITE_NAME } from '$app/env/public';
	import { formIssues } from '#lib/components/FormIssues.svelte';
	import StyledLabels from '#lib/components/StyledLabels.svelte';
	import { setupProfile as _setupProfile } from '#lib/remote/auth.remote.ts';
	import { SetupProfileSchema } from '#lib/schemas/auth.ts';

	let { data } = $props();
	const uid = $props.id();

	const setupProfile = _setupProfile.for(uid);
</script>

<div class="page-container">
	<main class="w-full page-card xs:w-sm">
		<header class="mt-2">
			<p class="text-sm text-gray-600">{SITE_NAME}</p>
			<h1 class="text-2xl font-bold">{data.title}</h1>
		</header>
		<StyledLabels>
			<form
				{...setupProfile.preflight(SetupProfileSchema)}
				class="mt-6 flex flex-col gap-y-4"
				onchange={() => setupProfile.validate({ preflightOnly: true })}
			>
				<!-- BLOCKED Use top-level fieldset to disable form during submission. -->
				<!-- See https://github.com/sveltejs/kit/issues/15104 -->
				<fieldset class="contents" disabled={false}>
					<label>
						<span>생년월일</span>
						<!-- svelte-ignore a11y_autofocus -->
						<input {...setupProfile.fields.birth.as('date')} autofocus />
						{@render formIssues(setupProfile.fields.birth.issues())}
					</label>
					<button class="btn btn-primary disabled:btn-busy" disabled={!!setupProfile.pending}>
						제출
					</button>
				</fieldset>
			</form>
		</StyledLabels>
	</main>
</div>
