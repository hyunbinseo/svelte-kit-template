import type { Payload } from '$lib/server/auth/token';

// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces
declare global {
	namespace App {
		// interface Error {}
		interface Locals {
			session?: Pick<Payload, 'sub'>;
		}

		interface PageData {
			title: string;
		}

		interface Platform {
			env: Env;
			ctx: ExecutionContext;
			caches: CacheStorage;
			cf?: IncomingRequestCfProperties;
		}

		// interface PageState {}
	}
}

export {};
