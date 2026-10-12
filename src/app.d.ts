import type { UserRole } from '#lib/enums/user.ts';

// See https://svelte.dev/docs/kit/types#app.d.ts
declare global {
	namespace App {
		// interface Error {}
		interface Locals {
			session?: {
				id: string;
				userId: string;
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
