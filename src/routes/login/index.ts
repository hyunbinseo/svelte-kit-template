import { CODE_LENGTH } from '$lib/config';
import { digits, email, length, object, pipe, string, uuid } from 'valibot';

export const CODE_BLOCKED = '새로운 인증번호로 재시도해주세요.';
export const CODE_EXPIRED = '만료된 인증번호입니다.';
export const CODE_INVALID = '잘못된 인증번호입니다.';
export const RATE_LIMITED = '잠시 뒤 재시도해주세요.';

export const PublicSendCodeSchema = object({
	email: pipe(string(), email()),
});

export const PublicValidateCodeSchema = object({
	id: pipe(string(), uuid()),
	code: pipe(string(), digits(), length(CODE_LENGTH)),
	email: pipe(string(), email()),
});
