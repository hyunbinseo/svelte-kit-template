export const validateErrorCodeToMessage = {
	codeExhausted: '입력 횟수를 초과했습니다. 재요청해 주세요.',
	codeExpired: '인증번호가 만료되었습니다. 재요청해 주세요.',
	codeInvalid: '인증번호가 올바르지 않습니다.',
	userDeactivated: '사용할 수 없는 계정입니다.',
} as const;

export type ValidateErrorCode = keyof typeof validateErrorCodeToMessage;

export const apiErrorCodeToValidateErrorCode: Record<string, ValidateErrorCode | undefined> = {
	INVALID_OTP: 'codeInvalid',
	OTP_EXPIRED: 'codeExpired',
	TOO_MANY_ATTEMPTS: 'codeExhausted',
	USER_DEACTIVATED: 'userDeactivated',
};
