import { form } from '$app/server';
import { requireCareCenterManager } from '#server/care-center/service.ts';
import { insertStudent } from '#server/student/service.ts';
import { getStudents } from '../get-students.remote.ts';
import { RegisterStudentSchema } from './shared.ts';

export const registerStudent = form(RegisterStudentSchema, async (data) => {
	const { session } = requireCareCenterManager(data.careCenterId);

	const student = insertStudent(data, session.sub);

	await getStudents(data.careCenterId).refresh();
	return student;
});
