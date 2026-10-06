import { requireCareCenterAccess } from '#server/care-center/service.ts';
import type { LayoutServerLoad } from './$types.ts';

export const load = (({ params }) => {
	const { careCenter, canManage } = requireCareCenterAccess(params.careCenterId);
	return { careCenter, canManage };
}) satisfies LayoutServerLoad;
