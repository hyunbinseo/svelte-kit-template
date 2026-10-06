import { form } from '$app/server';
import { invalid } from '@sveltejs/kit';
import { isFailure } from '#lib/failure.ts';
import {
	assignMember as insertMember,
	requireCareCenterManager,
} from '#server/care-center/service.ts';
import { getMembers } from '../get-members.remote.ts';
import { assignMemberErrors, AssignMemberSchema } from './shared.ts';

export const assignMember = form(AssignMemberSchema, async (data, issue) => {
	const { session } = requireCareCenterManager(data.careCenterId);

	const result = insertMember(data, session.sub);
	if (isFailure(result)) invalid(issue.contact(assignMemberErrors[result.failure]));

	await getMembers(data.careCenterId).refresh();
});
