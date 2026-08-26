import type { UserRole } from '#lib/enums/user.ts';
import type { Payload } from '#lib/server/auth/token.ts';

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
	}
}

export {};
