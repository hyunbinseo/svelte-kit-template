import { object } from 'valibot';
import { EmailSchema } from '#lib/valibot.ts';

export const SendCodeSchema = object({
	contact: EmailSchema,
});

export const sendErrors = {
	RATE_LIMITED: '진행 중인 로그인 시도가 있습니다. 잠시 후 재요청해 주세요.',
	SEND_FAILED: '인증번호를 보내지 못했습니다. 잠시 후 재요청해 주세요.',
	UNREGISTERED: '등록되지 않은 연락처입니다.',
} as const;
