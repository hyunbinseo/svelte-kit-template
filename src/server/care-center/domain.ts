import type { CareCenterRole } from '#lib/enums/care-center.ts';

type Viewer = { isAdmin: boolean; roles: CareCenterRole[] };

export const CareCenter = {
	canAccess: ({ isAdmin, roles }: Viewer) => isAdmin || roles.length > 0,
	canManage: ({ isAdmin, roles }: Viewer) => isAdmin || roles.includes('admin'),
};
