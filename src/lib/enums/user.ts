export type UserRole = 'admin';

export type UserRoleRevokeReason =
	| 'deactivate' //
	| 'manual';

export type UserSessionRevokeReason =
	| 'deactivate' //
	| 'logout';
