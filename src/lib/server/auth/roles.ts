import type { AppDbOrTx } from '#db/app/drizzle.ts';
import { findActiveUserRoles } from '#db/app/user/queries.ts';
import type { UserRole } from '#lib/enums/user.ts';

// Remote functions copy the event, but share its locals.
const rolesByLocals = new WeakMap<App.Locals, UserRole[]>();

// Takes the db, so the SvelteKit client can use it without an import cycle.
export const loadSessionRoles = (db: AppDbOrTx, locals: App.Locals) => {
	if (!locals.session) return [];

	let roles = rolesByLocals.get(locals);
	if (!roles) {
		roles = findActiveUserRoles(db, { userId: locals.session.userId });
		rolesByLocals.set(locals, roles);
	}
	return roles;
};
