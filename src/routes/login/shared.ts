import {
	email,
	maxLength,
	nonEmpty,
	object,
	optional,
	pipe,
	regex,
	string,
	toLowerCase,
	trim,
} from 'valibot';
import { LOGIN_CODE_DIGITS } from '#lib/auth/config.ts';

export const SendCodeSchema = object({
	contact: pipe(
		string(),
		trim(),
		toLowerCase(),
		nonEmpty('이메일을 입력해 주세요.'),
		email('이메일 형식이 올바르지 않습니다.'),
		maxLength(254, '이메일이 너무 깁니다.'),
	),
});

export const VerifyCodeSchema = object({
	code: pipe(
		string(),
		trim(),
		regex(
			new RegExp(`^\\d{${LOGIN_CODE_DIGITS}}$`),
			`인증번호 ${LOGIN_CODE_DIGITS}자리를 입력해 주세요.`,
		),
	),
	returnTo: optional(string()),
});
