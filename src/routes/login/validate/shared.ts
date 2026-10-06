import { digits, length, object, pipe, string, uuid } from 'valibot';
import { AUTH_CODE_LENGTH } from '#auth/config.ts';
import { EmailSchema } from '#lib/valibot.ts';

export const ValidateCodeSchema = object({
	id: pipe(string(), uuid()),
	contact: EmailSchema,
	code: pipe(string(), digits(), length(AUTH_CODE_LENGTH)),
});

export const validateErrors = {
	CODE_BLOCKED: '새로운 인증번호로 재시도해주세요.',
	CODE_EXPIRED: '만료된 인증번호입니다.',
	CODE_INVALID: '잘못된 인증번호입니다.',
	IP_MISMATCH: '접속 환경이 바뀌었습니다.',
	USER_DEACTIVATED: '비활성화된 계정입니다.',
} as const;

export type ValidateErrorCode = keyof typeof validateErrors;
