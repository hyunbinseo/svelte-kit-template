import { and, eq, isNotNull, isNull, or, sql } from 'drizzle-orm';
import { type AnySQLiteColumn, check } from 'drizzle-orm/sqlite-core';

// Matches the globs in softDeleteChecks, see specs/08-auth.md
export type SoftDeleteReason = `${'admin' | 'cascade' | 'system' | 'user'}_${string}`;

// [verb]At/[verb]By/[verb]Reason, see specs/05-database.md
export const softDeleteChecks = (
	groupName: string,
	group: Record<'at' | 'by' | 'reason', AnySQLiteColumn>,
) => [
	check(
		`${groupName}_nullity_check`,
		and(
			eq(isNull(group.at), isNull(group.reason)), // *_at and *_reason require each other
			or(isNull(group.by), isNotNull(group.at)), // *_by requires *_at
		)!,
	),
	// Reasons are [actor]_[verb] or cascade_[parent group], see specs/08-auth.md
	check(
		`${groupName}_reason_check`,
		and(
			// Known prefix or no reason
			or(
				sql`${group.reason} glob 'admin_*'`,
				sql`${group.reason} glob 'cascade_*'`,
				sql`${group.reason} glob 'system_*'`,
				sql`${group.reason} glob 'user_*'`,
				isNull(group.reason),
			),
			or(sql`${group.reason} not glob 'admin_*'`, isNotNull(group.by)), // admin_* requires *_by
			or(sql`${group.reason} not glob 'system_*'`, isNull(group.by)), // system_* forbids *_by
		)!,
	),
];
