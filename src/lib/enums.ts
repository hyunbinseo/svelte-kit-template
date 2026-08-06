export type UserRole = 'admin';

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

// NOTE `const` array enables runtime validation and iteration
export const exampleStatuses = ['draft', 'published'] as const;
export type ExampleStatus = (typeof exampleStatuses)[number];
