import { digits, length, object, pipe, string, uuid } from 'valibot';
import { AUTH_CODE_LENGTH } from '#auth/config.ts';
import { EmailSchema } from '#lib/valibot.ts';

export const ValidateCodeSchema = object({
	id: pipe(string(), uuid()),
	contact: EmailSchema,
	code: pipe(string(), digits(), length(AUTH_CODE_LENGTH)),
});

export const validateErrors = {
	CODE_EXHAUSTED: '입력 횟수를 초과했습니다. 잠시 후 재요청해 주세요.',
	CODE_EXPIRED: '인증번호가 만료되었습니다. 재요청해 주세요.',
	CODE_INVALID: '인증번호가 올바르지 않습니다.',
	CODE_USED: '이미 사용한 인증번호입니다. 재요청해 주세요.',
	IP_MISMATCH: '접속 환경이 바뀌었습니다. 잠시 후 재요청해 주세요.',
	USER_DEACTIVATED: '사용할 수 없는 계정입니다.',
} as const;

export type ValidateErrorCode = keyof typeof validateErrors;
