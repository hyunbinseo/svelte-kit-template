import { form } from '$app/server';
import { requireCareCenterManager } from '#server/care-center/service.ts';
import { findDuplicateStudents as findDuplicates } from '#server/student/service.ts';
import { FindDuplicateStudentsSchema } from './shared.ts';

export const findDuplicateStudents = form(
	FindDuplicateStudentsSchema,
	({ careCenterId, ...student }) => {
		const { session } = requireCareCenterManager(careCenterId);

		// System admins search every care center; others only their own.
		const scope = session.roles.has('admin') ? undefined : careCenterId;

		return { ...student, matches: findDuplicates(student, scope) };
	},
);
