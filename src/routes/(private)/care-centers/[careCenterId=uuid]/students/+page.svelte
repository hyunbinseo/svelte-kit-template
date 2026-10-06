<script lang="ts">
	import { gradeShortToFull, manualStudentRemovedReasons } from '#lib/enums/student.ts';
	import { getStudents } from './get-students.remote.ts';
	import { removeStudentFromCareCenter } from './remove-student/remote.ts';
	import StudentRegisterForm from './StudentRegisterForm.svelte';

	let { data, params } = $props();
</script>

<div class="mt-6 grid gap-8 md:grid-cols-[1fr_16rem]">
	<table class="w-full text-left">
		<thead class="text-sm text-gray-600">
			<tr>
				<th class="py-2">이름</th>
				<th class="py-2">생년월일</th>
				<th class="py-2">학년</th>
				{#if data.canManage}
					<th class="py-2"></th>
				{/if}
			</tr>
		</thead>
		<tbody class="divide-y">
			{#each await getStudents(params.careCenterId) as student (student.id)}
				<tr>
					<td class="py-2">{student.name}</td>
					<td class="py-2 tabular-nums">{student.birth}</td>
					<td class="py-2">{gradeShortToFull[student.grade]}</td>
					{#if data.canManage}
						{const remove = removeStudentFromCareCenter.for(student.id)}
						<td class="py-2">
							<form {...remove} class="flex gap-x-1">
								<!-- BLOCKED Use top-level fieldset to disable form during submission. -->
								<!-- See https://github.com/sveltejs/kit/issues/15104 -->
								<fieldset class="contents" disabled={false}>
									<input {...remove.fields.careCenterId.as('hidden', params.careCenterId)} />
									<input {...remove.fields.studentId.as('hidden', student.id)} />
									<select {...remove.fields.reason.as('select')} class="py-0 text-sm">
										{#each manualStudentRemovedReasons as reason (reason)}
											<option value={reason}>{reason}</option>
										{/each}
									</select>
									<button class="btn py-0 text-sm disabled:btn-busy" disabled={!!remove.pending}>
										제외
									</button>
								</fieldset>
							</form>
						</td>
					{/if}
				</tr>
			{:else}
				<tr>
					<td class="py-2 text-gray-600" colspan="4">등록된 학생이 없습니다.</td>
				</tr>
			{/each}
		</tbody>
	</table>
	{#if data.canManage}
		<section>
			<h2 class="mb-4 text-lg font-bold">학생 등록</h2>
			<StudentRegisterForm careCenterId={params.careCenterId} />
		</section>
	{/if}
</div>
