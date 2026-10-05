import { object } from 'valibot';
import { EmailSchema } from '#lib/valibot.ts';

export const SendCodeSchema = object({
	contact: EmailSchema,
});

export const sendErrors = {
	RATE_LIMITED: '잠시 뒤 재시도해주세요.',
	UNREGISTERED: '등록되지 않은 사용자입니다.',
} as const;

export type SendErrorCode = keyof typeof sendErrors;
