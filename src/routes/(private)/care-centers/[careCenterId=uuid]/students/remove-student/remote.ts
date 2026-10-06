import { form } from '$app/server';
import { error } from '@sveltejs/kit';
import { requireCareCenterManager } from '#server/care-center/service.ts';
import { removeStudent } from '#server/student/service.ts';
import { getStudents } from '../get-students.remote.ts';
import { RemoveStudentSchema } from './shared.ts';

export const removeStudentFromCareCenter = form(RemoveStudentSchema, async (data) => {
	const { session } = requireCareCenterManager(data.careCenterId);

	const removed = removeStudent(data, session.sub);
	if (!removed) error(404);

	await getStudents(data.careCenterId).refresh();
});
