<script lang="ts">
	import { SITE_NAME } from '$app/env/public';
	import { formIssues } from '#lib/components/FormIssues.svelte';
	import StyledLabels from '#lib/components/StyledLabels.svelte';
	import { setupProfile as _setupProfile } from './setup.remote.ts';
	import { SetupProfileSchema, setupProfileAttributes } from './setup.ts';

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
				onchange={() => setupProfile.validate({ preflightOnly: true })}
				class="mt-6 flex flex-col gap-y-4"
			>
				<fieldset class="contents">
					<label>
						<span>생년월일</span>
						<!-- svelte-ignore a11y_autofocus -->
						<input
							{...setupProfile.fields.birth.as('date')}
							{...setupProfileAttributes.birth}
							autofocus
						/>
						{@render formIssues(setupProfile.fields.birth.issues())}
					</label>
					<button disabled={!!setupProfile.pending} class="btn btn-primary disabled:btn-busy">
						제출
					</button>
				</fieldset>
			</form>
		</StyledLabels>
	</main>
</div>
