import type { InferOutput } from 'valibot';
import type { AssignMemberSchema, CreateCareCenterSchema } from '#lib/schemas/care-center.ts';
import { CareCenter, type CareCenters } from '#server/domain/care-center.ts';
import type { Viewer } from '#server/domain/viewer.ts';

export const createCareCenter = (
	careCenters: CareCenters,
	viewer: Viewer,
	input: InferOutput<typeof CreateCareCenterSchema>,
) =>
	CareCenter.checkCreate(viewer).andThen(() =>
		careCenters.create({ ...input, createdBy: viewer.userId }),
	);

export const listMembers = (careCenters: CareCenters, viewer: Viewer, careCenterId: string) =>
	careCenters.getAccess(careCenterId, viewer).andThen(() => careCenters.listMembers(careCenterId));

export const assignMember = (
	careCenters: CareCenters,
	viewer: Viewer,
	{ careCenterId, contact, role }: InferOutput<typeof AssignMemberSchema>,
) =>
	careCenters
		.getAccess(careCenterId, viewer)
		.andThen(CareCenter.checkManage)
		.andThen(() =>
			careCenters.assignMember(contact, { careCenterId, role, assignedBy: viewer.userId }),
		);
