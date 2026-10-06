import { form, query } from '$app/server';
import {
	FindDuplicateStudentsSchema,
	RegisterStudentSchema,
	RemoveStudentSchema,
} from '#lib/schemas/student.ts';
import { UUIDSchema } from '#lib/valibot.ts';
import { getApp } from '#server/app.ts';
import { currentViewer, rejectForm, throwFailure } from '#server/request.ts';

export const getStudents = query(UUIDSchema, (careCenterId) =>
	currentViewer()
		.andThen((viewer) => getApp().listStudents(viewer, careCenterId))
		.match((students) => students, throwFailure),
);

export const findDuplicateStudents = form(FindDuplicateStudentsSchema, (input) =>
	currentViewer()
		.andThen((viewer) => getApp().findDuplicateStudents(viewer, input))
		.match((result) => result, rejectForm),
);

export const registerStudent = form(RegisterStudentSchema, async (input) => {
	const student = currentViewer()
		.andThen((viewer) => getApp().registerStudent(viewer, input))
		.match((student) => student, rejectForm);

	await getStudents(input.careCenterId).refresh();
	return student;
});

export const removeStudentFromCareCenter = form(RemoveStudentSchema, (input) =>
	currentViewer()
		.andThen((viewer) => getApp().removeStudent(viewer, input))
		.match(() => getStudents(input.careCenterId).refresh(), rejectForm),
);
