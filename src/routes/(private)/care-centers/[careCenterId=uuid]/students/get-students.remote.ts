import { query } from '$app/server';
import { UUIDSchema } from '#lib/valibot.ts';
import { requireCareCenterAccess } from '#server/care-center/service.ts';
import { findStudents } from '#server/student/service.ts';

export const getStudents = query(UUIDSchema, (careCenterId) => {
	requireCareCenterAccess(careCenterId);
	return findStudents(careCenterId);
});
