// See https://svelte.dev/docs/kit/types#app.d.ts
declare global {
	namespace App {
		// interface Error {}
		interface Locals {
			// Set by handleSession (#lib/server/auth/session.ts)
			session?: {
				id: number;
				isOnboarded: boolean;
				userId: number;
			};
		}
		interface PageData {
			// Overrides the root layout's noindex, e.g. from a page's load
			robots?: string;
		}
		// interface PageState {}
		// interface Platform {}
	}
}

export {};
