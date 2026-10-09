import type { AnyRelations } from 'drizzle-orm';
import type { NodeSQLiteDatabase, NodeSQLiteTransaction } from 'drizzle-orm/node-sqlite';
import type { Payload } from '#auth/server/token.ts';
import type { relations } from '#database/relations.ts';
import type { UserRole } from '#lib/enums/user.ts';

// See https://svelte.dev/docs/kit/types#app.d.ts
declare global {
	namespace App {
		// interface Error {}
		interface Locals {
			session?: Pick<Payload, 'jti' | 'sub'> & {
				profile: boolean;
				roles: Set<UserRole>;
			};
		}
		interface PageData {
			title: string;
			robots?: 'index' | 'noindex, nofollow' | (string & {});
		}
		// interface PageState {}
		// interface Platform {}

		type Database = NodeSQLiteDatabase<typeof relations> | NodeSQLiteTransaction<typeof relations>;

		type ReadDatabase<R extends AnyRelations = typeof relations> = Pick<
			NodeSQLiteDatabase<R>,
			'query' | 'select' | 'selectDistinct'
		>;
	}
}
