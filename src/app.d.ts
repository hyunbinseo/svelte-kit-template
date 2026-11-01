import type { UserSelect } from '#db/app/server/schema.ts';

// See https://svelte.dev/docs/kit/types#app.d.ts
declare global {
	namespace App {
		// interface Error {}
		interface Locals {
			// Placeholder until specs/08-auth.md sets it
			user?: Pick<UserSelect, 'id'>;
		}
		// interface PageData {}
		// interface PageState {}
		// interface Platform {}
	}
}

export {};
