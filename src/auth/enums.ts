export type TokenRevokeReason =
	| 'deactivate' //
	| 'logout'
	| 'reuse';

export type TokenBanReason =
	| TokenRevokeReason //
	| 'rotate'
	| 'stale';

export type TokenRefreshReason =
	| 'profile' //
	| 'stale'
	| 'threshold';
