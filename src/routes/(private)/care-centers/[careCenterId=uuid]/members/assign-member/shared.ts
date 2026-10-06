import { object, picklist } from 'valibot';
import { careCenterRoles } from '#lib/enums/care-center.ts';
import { EmailSchema, UUIDSchema } from '#lib/valibot.ts';

export const AssignMemberSchema = object({
	careCenterId: UUIDSchema,
	contact: EmailSchema,
	role: picklist(careCenterRoles),
});

export const assignMemberErrors = {
	ALREADY_ASSIGNED: '이미 같은 역할이 있습니다.',
	USER_NOT_FOUND: '가입하지 않은 이메일입니다.',
} as const;

export type AssignMemberErrorCode = keyof typeof assignMemberErrors;
