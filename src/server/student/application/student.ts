import type { InferOutput } from 'valibot';
import type {
	FindDuplicateStudentsSchema,
	RegisterStudentSchema,
	RemoveStudentSchema,
} from '#lib/schemas/student.ts';
import { CareCenter, type CareCenters } from '#server/domain/care-center.ts';
import type { Transactions } from '#server/domain/content.ts';
import type { Students } from '#server/domain/student.ts';
import type { Viewer } from '#server/domain/viewer.ts';

export const listStudents = (
	careCenters: CareCenters,
	students: Students,
	viewer: Viewer,
	careCenterId: string,
) => careCenters.getAccess(careCenterId, viewer).andThen(() => students.list(careCenterId));

export const findDuplicateStudents = (
	careCenters: CareCenters,
	students: Students,
	viewer: Viewer,
	{ careCenterId, name, birth }: InferOutput<typeof FindDuplicateStudentsSchema>,
) =>
	careCenters
		.getAccess(careCenterId, viewer)
		.andThen(CareCenter.checkManage)
		// System admins search every care center; others only their own.
		.andThen(() => students.findDuplicates(name, birth, viewer.isAdmin ? undefined : careCenterId))
		.map((matches) => ({ name, birth, matches }));

export const registerStudent = (
	careCenters: CareCenters,
	transactions: Transactions,
	viewer: Viewer,
	input: InferOutput<typeof RegisterStudentSchema>,
) =>
	careCenters
		.getAccess(input.careCenterId, viewer)
		.andThen(CareCenter.checkManage)
		.andThen(() =>
			transactions.run(({ students }) => students.register({ ...input, createdBy: viewer.userId })),
		);

export const removeStudent = (
	careCenters: CareCenters,
	students: Students,
	viewer: Viewer,
	input: InferOutput<typeof RemoveStudentSchema>,
) =>
	careCenters
		.getAccess(input.careCenterId, viewer)
		.andThen(CareCenter.checkManage)
		.andThen(() => students.remove({ ...input, removedBy: viewer.userId }));
