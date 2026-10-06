import { nonEmpty, object, picklist, pipe, string, trim } from 'valibot';
import { manualStudentRemovedReasons, shortGrades } from '#lib/enums/student.ts';
import { ISODateSchema, UUIDSchema } from '#lib/valibot.ts';

const StudentNameSchema = pipe(string(), trim(), nonEmpty('이름을 입력해 주세요.'));

export const FindDuplicateStudentsSchema = object({
	careCenterId: UUIDSchema,
	name: StudentNameSchema,
	birth: ISODateSchema,
});

export const RegisterStudentSchema = object({
	careCenterId: UUIDSchema,
	name: StudentNameSchema,
	birth: ISODateSchema,
	grade: picklist(shortGrades),
});

export const RemoveStudentSchema = object({
	careCenterId: UUIDSchema,
	studentId: UUIDSchema,
	reason: picklist(manualStudentRemovedReasons),
});
