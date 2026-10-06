import { object, picklist } from 'valibot';
import { shortGrades } from '#lib/enums/student.ts';
import { StudentNameSchema } from '#lib/student.ts';
import { ISODateSchema, UUIDSchema } from '#lib/valibot.ts';

export const RegisterStudentSchema = object({
	careCenterId: UUIDSchema,
	name: StudentNameSchema,
	birth: ISODateSchema,
	grade: picklist(shortGrades),
});
