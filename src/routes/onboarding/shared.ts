import { check, isoDate, object, optional, pipe, string } from 'valibot';

export const OnboardSchema = object({
	birthDate: pipe(
		string(),
		isoDate('생년월일을 입력해 주세요.'),
		check(
			(birthDate) =>
				birthDate >= '1900-01-01' && birthDate <= new Date().toISOString().slice(0, 10),
			'생년월일이 올바르지 않습니다.',
		),
	),
	returnTo: optional(string()),
});
