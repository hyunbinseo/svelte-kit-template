import { object } from 'valibot';
import { StudentNameSchema } from '#lib/student.ts';
import { ISODateSchema, UUIDSchema } from '#lib/valibot.ts';

export const FindDuplicateStudentsSchema = object({
	careCenterId: UUIDSchema,
	name: StudentNameSchema,
	birth: ISODateSchema,
});
