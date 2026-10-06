import { query } from '$app/server';
import { UUIDSchema } from '#lib/valibot.ts';
import { findMembers, requireCareCenterAccess } from '#server/care-center/service.ts';

export const getMembers = query(UUIDSchema, (careCenterId) => {
	requireCareCenterAccess(careCenterId);
	return findMembers(careCenterId);
});
