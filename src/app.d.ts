import type { Role } from '#lib/enums';
import type { Payload } from '#lib/server/auth/token';

// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces
declare global {
	namespace App {
		// interface Error {}
		interface Locals {
			session?: Pick<Payload, 'jti' | 'sub'> & {
				roles: Set<Role>;
			};
		}
		interface PageData {
			title: string;
		}
		// interface PageState {}
		// interface Platform {}
	}
}

export {};
