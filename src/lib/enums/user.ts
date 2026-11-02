import type { ReasonCode } from '#lib/enums/reason.ts';

// Stored in rows with no CHECK: renaming or removing a value needs a data migration.

export type UserRole = (typeof userRoles)[number];
export const userRoles = [
	'admin', //
] as const;

export type UserClosedReason = (typeof userClosedReasons)[number];
export const userClosedReasons = [
	'admin_banned',
	'admin_removed',
	'system_removed',
	'user_requested',
] as const satisfies readonly ReasonCode[];

export type UserRoleRevokeReason = (typeof userRoleRevokeReasons)[number];
export const userRoleRevokeReasons = [
	'admin_removed',
	'user_requested',
] as const satisfies readonly ReasonCode[];

export const userRoleRevokedReasons = [
	...userRoleRevokeReasons,
	'cascade_user_closed', // procedures only
] as const satisfies readonly ReasonCode[];

export type UserSessionRevokeReason = (typeof userSessionRevokeReasons)[number];
export const userSessionRevokeReasons = [
	'admin_terminated',
	'user_logged_out',
] as const satisfies readonly ReasonCode[];

export const userSessionRevokedReasons = [
	...userSessionRevokeReasons,
	'cascade_user_closed', // procedures only
] as const satisfies readonly ReasonCode[];
