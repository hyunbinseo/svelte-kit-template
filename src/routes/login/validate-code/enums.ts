export const validateErrorCodeToMessage = {
	codeExhausted: '입력 횟수를 초과했습니다. 잠시 후 재요청해 주세요.',
	codeExpired: '인증번호가 만료되었습니다. 재요청해 주세요.',
	codeInvalid: '인증번호가 올바르지 않습니다.',
	codeUsed: '이미 사용한 인증번호입니다. 재요청해 주세요.',
	ipMismatch: '접속 환경이 바뀌었습니다. 잠시 후 재요청해 주세요.',
	userDeactivated: '사용할 수 없는 계정입니다.',
} as const;

export type ValidateErrorCode = keyof typeof validateErrorCodeToMessage;
