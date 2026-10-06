<script lang="ts">
	import { formIssues } from '#lib/components/FormIssues.svelte';
	import StyledLabels from '#lib/components/StyledLabels.svelte';
	import { careCenterRoles, careCenterRoleToLabel } from '#lib/enums/care-center.ts';
	import { PLACEHOLDER_EMAIL } from '#lib/placeholders.ts';
	import { assignMember } from './assign-member/remote.ts';
	import { AssignMemberSchema } from './assign-member/shared.ts';
	import { getMembers } from './get-members.remote.ts';

	let { data, params } = $props();
</script>

<table class="mt-6 w-full text-left">
	<thead class="text-sm text-gray-600">
		<tr>
			<th class="py-2">이메일</th>
			<th class="py-2">역할</th>
			<th class="py-2">배정일</th>
		</tr>
	</thead>
	<tbody class="divide-y">
		{#each await getMembers(params.careCenterId) as member (member.id)}
			<tr>
				<td class="py-2">{member.contact}</td>
				<td class="py-2">{careCenterRoleToLabel[member.role]}</td>
				<td class="py-2">{member.assignedAt.toLocaleDateString()}</td>
			</tr>
		{/each}
	</tbody>
</table>

{#if data.canManage}
	<h2 class="mt-10 text-lg font-bold">구성원 추가</h2>
	<StyledLabels>
		<form
			{...assignMember.preflight(AssignMemberSchema).enhance(async (form) => {
				if (await form.submit()) form.element.reset();
			})}
			class="mt-4 flex flex-col gap-y-4"
		>
			<!-- BLOCKED Use top-level fieldset to disable form during submission. -->
			<!-- See https://github.com/sveltejs/kit/issues/15104 -->
			<fieldset class="contents" disabled={false}>
				<input {...assignMember.fields.careCenterId.as('hidden', params.careCenterId)} />
				<label>
					<span>이메일</span>
					<input {...assignMember.fields.contact.as('email')} placeholder={PLACEHOLDER_EMAIL} />
					{@render formIssues(assignMember.fields.contact.issues())}
				</label>
				<label>
					<span>역할</span>
					<select {...assignMember.fields.role.as('select')}>
						{#each careCenterRoles as role (role)}
							<option value={role}>{careCenterRoleToLabel[role]}</option>
						{/each}
					</select>
					{@render formIssues(assignMember.fields.role.issues())}
				</label>
				<button class="btn btn-primary disabled:btn-busy" disabled={!!assignMember.pending}>
					추가
				</button>
			</fieldset>
		</form>
	</StyledLabels>
{/if}
