export type TokenRevokeReason =
	| 'deactivate' //
	| 'logout';

export type TokenBanReason =
	| TokenRevokeReason //
	| 'rotate'
	| 'stale';

export type TokenRefreshReason =
	| 'profile' //
	| 'stale'
	| 'threshold';
