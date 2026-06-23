export type UserRole = 'admin';

export type TokenRevokeReason =
	| 'deactivate' //
	| 'logout';

export type TokenBanReason =
	| TokenRevokeReason //
	| 'rotate'
	| 'stale';
