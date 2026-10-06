export type CareCenterRole = keyof typeof careCenterRoleToLabel;
export const careCenterRoleToLabel = {
	admin: '센터 관리자',
	staff: '센터 직원',
} as const;
export const careCenterRoles = Object.keys(careCenterRoleToLabel) as readonly CareCenterRole[];

export type CareCenterRoleRevokeReason = (typeof careCenterRoleRevokeReasons)[number];
export const careCenterRoleRevokeReasons = [
	'기관_비활성화', //
	'회원_비활성화',
	'수동',
] as const;

export type CareCenterType = (typeof careCenterTypes)[number];
export const careCenterTypes = [
	'보육원', //
	'지역아동센터',
] as const;
