import { email, pipe, string } from 'valibot';

export const CODE_BLOCKED = '새로운 인증번호로 재시도해주세요.';
export const CODE_EXPIRED = '만료된 인증번호입니다.';
export const CODE_INVALID = '잘못된 인증번호입니다.';
export const RATE_LIMITED = '잠시 뒤 재시도해주세요.';
export const UNREGISTERED = '등록되지 않은 사용자입니다.';

export const ContactSchema = pipe(string(), email());
