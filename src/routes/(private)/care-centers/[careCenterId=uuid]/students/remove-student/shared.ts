import { object, picklist } from 'valibot';
import { manualStudentRemovedReasons } from '#lib/enums/student.ts';
import { UUIDSchema } from '#lib/valibot.ts';

export const RemoveStudentSchema = object({
	careCenterId: UUIDSchema,
	studentId: UUIDSchema,
	reason: picklist(manualStudentRemovedReasons),
});
