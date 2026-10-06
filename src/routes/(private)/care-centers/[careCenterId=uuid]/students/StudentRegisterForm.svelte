<script lang="ts">
	import type { RemoteFormIssue } from '$app/server';
	import { slide } from 'svelte/transition';
	import { formIssues } from '#lib/components/FormIssues.svelte';
	import StyledLabels from '#lib/components/StyledLabels.svelte';
	import { gradeShortToFull, shortGrades } from '#lib/enums/student.ts';
	import { suggestGrade } from '#lib/student.ts';
	import { findDuplicateStudents as _findDuplicateStudents } from './find-duplicate-students/remote.ts';
	import { FindDuplicateStudentsSchema } from './find-duplicate-students/shared.ts';
	import { registerStudent as _registerStudent } from './register-student/remote.ts';
	import { RegisterStudentSchema } from './register-student/shared.ts';

	let { careCenterId }: { careCenterId: string } = $props();

	const uid = $props.id();

	// BLOCKED Programmatically reset remote form state.
	// See https://github.com/sveltejs/kit/issues/14210
	let round = $state(0);

	const findDuplicateStudents = $derived(_findDuplicateStudents.for(`${uid}-${round}`));
	const registerStudent = $derived(_registerStudent.for(`${uid}-${round}`));

	const duplicateResult = $derived(findDuplicateStudents.result);

	let basicInfoConfirmed = $derived(duplicateResult?.matches.length === 0);

	const duplicateStudents = $derived(
		!duplicateResult?.matches.length ||
			duplicateResult.name !== findDuplicateStudents.fields.name.value()?.trim() ||
			duplicateResult.birth !== findDuplicateStudents.fields.birth.value()
			? null
			: duplicateResult.matches,
	);

	const suggestedGrade = $derived(duplicateResult && suggestGrade(duplicateResult.birth));

	let registeredName = $state<string | null>(null);

	let confirmNewCheckbox = $state<HTMLInputElement>();
	let confirmNewIssues = $state<RemoteFormIssue[]>();

	const clearBasicInfo = () => {
		round += 1;
		confirmNewIssues = undefined;
	};
</script>

<StyledLabels>
	{#if !basicInfoConfirmed}
		{#if registeredName}
			<p class="text-green-700" transition:slide>{registeredName} 학생이 등록되었습니다.</p>
		{/if}
		<form
			{...findDuplicateStudents
				.preflight(FindDuplicateStudentsSchema)
				// Skip default reset
				.enhance((form) => {
					if (duplicateStudents) {
						if (!confirmNewCheckbox?.checked) {
							confirmNewIssues = [
								{ message: '새로운 학생으로 등록하려면 체크해 주세요.', path: [] },
							];
							return;
						}
						basicInfoConfirmed = true;
					} else {
						void form.submit().updates();
					}
				})}
			class="flex flex-col gap-y-4"
			onchange={() => findDuplicateStudents.validate({ preflightOnly: true })}
		>
			<!-- BLOCKED Use top-level fieldset to disable form during submission. -->
			<!-- See https://github.com/sveltejs/kit/issues/15104 -->
			<fieldset class="contents" disabled={false}>
				<input {...findDuplicateStudents.fields.careCenterId.as('hidden', careCenterId)} />
				<label>
					<span>학생 이름</span>
					<input {...findDuplicateStudents.fields.name.as('text')} />
					{@render formIssues(findDuplicateStudents.fields.name.issues())}
				</label>
				<label>
					<span>생년월일</span>
					<input {...findDuplicateStudents.fields.birth.as('date')} />
					{@render formIssues(findDuplicateStudents.fields.birth.issues())}
				</label>
				{#if duplicateStudents}
					<div class="flex flex-col gap-y-3 rounded border border-amber-300 bg-amber-50 p-3">
						<p class="text-sm text-amber-900">
							이름과 생년월일이 같은 학생이 {duplicateStudents.length}명 있어요.
						</p>
						<ul class="flex list-inside list-disc flex-col gap-y-1 text-sm text-gray-700">
							{#each duplicateStudents as match (match.id)}
								<li>
									{gradeShortToFull[match.grade]}
									{#if match.careCenters.length}
										<span>/ {match.careCenters.join(', ')} 소속</span>
									{/if}
								</li>
							{/each}
						</ul>
						<div>
							<label>
								<input
									bind:this={confirmNewCheckbox}
									onchange={() => (confirmNewIssues = undefined)}
									type="checkbox"
								/>
								<span>새로운 학생으로 등록할게요</span>
							</label>
							{@render formIssues(confirmNewIssues)}
						</div>
					</div>
				{/if}
				<button
					class="btn btn-primary disabled:btn-busy"
					disabled={!!findDuplicateStudents.pending}
				>
					다음
				</button>
			</fieldset>
		</form>
	{:else if duplicateResult}
		<form
			{...registerStudent.preflight(RegisterStudentSchema).enhance(async (form) => {
				if (await form.submit()) {
					registeredName = form.result?.name ?? null;
					clearBasicInfo();
				}
			})}
			// No onchange validation, which clears `.as('select')` fields
			class="flex flex-col gap-y-4"
		>
			<fieldset class="contents" disabled={false}>
				<input {...registerStudent.fields.careCenterId.as('hidden', careCenterId)} />
				<input {...registerStudent.fields.name.as('hidden', duplicateResult.name)} />
				<input {...registerStudent.fields.birth.as('hidden', duplicateResult.birth)} />
				<p>
					<span class="font-semibold">{duplicateResult.name}</span>
					<span class="text-gray-600">({duplicateResult.birth})</span>
					<button
						class="ml-2 text-sm text-gray-600 underline"
						onclick={() => (basicInfoConfirmed = false)}
						type="button"
					>
						수정
					</button>
				</p>
				<label>
					<span>
						초기 학년/구분 배정
						{#if suggestedGrade}
							<span class="text-sm text-gray-600">(추천: {gradeShortToFull[suggestedGrade]})</span>
						{/if}
					</span>
					<select {...registerStudent.fields.grade.as('select')}>
						<option value="">학년 선택</option>
						{#each shortGrades as grade (grade)}
							<option value={grade}>{gradeShortToFull[grade]}</option>
						{/each}
					</select>
					{@render formIssues(registerStudent.fields.grade.issues())}
				</label>
				<button class="btn btn-primary disabled:btn-busy" disabled={!!registerStudent.pending}>
					학생 등록
				</button>
			</fieldset>
		</form>
	{/if}
</StyledLabels>
