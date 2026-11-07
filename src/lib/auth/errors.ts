import { LOGIN_CODE_LIFETIME_MS } from '#lib/auth/config.ts';

export type AuthError = keyof typeof authErrorMessages;
export const authErrorMessages = {
	code_mismatch: '인증번호가 일치하지 않습니다.',
	code_send_failed: '인증번호를 보내지 못했습니다. 잠시 후 다시 시도해 주세요.',
	login_expired: '인증번호가 만료되었습니다. 다시 요청해 주세요.',
	login_pending: `이미 보낸 인증번호가 있습니다. ${LOGIN_CODE_LIFETIME_MS / 60_000}분 후 다시 요청해 주세요.`,
	sign_up_closed: '가입되지 않은 이메일입니다.',
	unauthorized: '로그인이 필요합니다.',
	user_closed: '이용할 수 없는 계정입니다.',
} as const satisfies Record<string, string>;
