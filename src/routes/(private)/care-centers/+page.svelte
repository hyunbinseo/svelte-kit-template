<script lang="ts">
	import { resolve } from '$app/paths';
	import { formIssues } from '#lib/components/FormIssues.svelte';
	import StyledLabels from '#lib/components/StyledLabels.svelte';
	import { careCenterTypes } from '#lib/enums/care-center.ts';
	import { createCareCenter } from './create-care-center/remote.ts';
	import { CreateCareCenterSchema } from './create-care-center/shared.ts';
	import { getCareCenters } from './get-care-centers.remote.ts';

	let { data } = $props();
</script>

<main class="mx-auto max-w-2xl p-8">
	<h1 class="text-2xl font-bold">센터</h1>
	<ul class="mt-6 divide-y">
		{#each await getCareCenters() as careCenter (careCenter.id)}
			<li class="py-3">
				<a
					class="font-semibold"
					href={resolve('/(private)/care-centers/[careCenterId=uuid]/students', {
						careCenterId: careCenter.id,
					})}
				>
					{careCenter.name}
				</a>
				<span class="ml-2 text-sm text-gray-600">{careCenter.type} · {careCenter.fullName}</span>
			</li>
		{:else}
			<li class="py-3 text-gray-600">
				소속된 센터가 없습니다. 센터 관리자에게 권한을 요청해 주세요.
			</li>
		{/each}
	</ul>
	{#if data.isAdmin}
		<h2 class="mt-10 text-lg font-bold">센터 등록</h2>
		<StyledLabels>
			<form
				{...createCareCenter.preflight(CreateCareCenterSchema)}
				class="mt-4 flex flex-col gap-y-4"
			>
				<!-- BLOCKED Use top-level fieldset to disable form during submission. -->
				<!-- See https://github.com/sveltejs/kit/issues/15104 -->
				<fieldset class="contents" disabled={false}>
					<label>
						<span>유형</span>
						<select {...createCareCenter.fields.type.as('select')}>
							{#each careCenterTypes as type (type)}
								<option value={type}>{type}</option>
							{/each}
						</select>
						{@render formIssues(createCareCenter.fields.type.issues())}
					</label>
					<label>
						<span>정식 명칭</span>
						<input
							{...createCareCenter.fields.fullName.as('text')}
							placeholder="서울SOS지역아동복지센터"
						/>
						{@render formIssues(createCareCenter.fields.fullName.issues())}
					</label>
					<label>
						<span>약칭</span>
						<input {...createCareCenter.fields.name.as('text')} placeholder="서울SOS" />
						{@render formIssues(createCareCenter.fields.name.issues())}
					</label>
					<label>
						<span>주소</span>
						<input {...createCareCenter.fields.address.as('text')} />
						{@render formIssues(createCareCenter.fields.address.issues())}
					</label>
					<label>
						<span>연락처</span>
						<input {...createCareCenter.fields.contact.as('tel')} />
						{@render formIssues(createCareCenter.fields.contact.issues())}
					</label>
					<button class="btn btn-primary disabled:btn-busy" disabled={!!createCareCenter.pending}>
						등록
					</button>
				</fieldset>
			</form>
		</StyledLabels>
	{/if}
</main>
