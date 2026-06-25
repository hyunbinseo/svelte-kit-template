import {
	AUTH_COOKIE_NAME,
	AUTH_TOKEN_ROTATE_GRACE,
	AUTH_TOKEN_ROTATE_THRESHOLD,
} from '#lib/config.ts';
import { tokenBanTable } from '#lib/database/schema.ts';
import { db, silentDb } from '#lib/server/database/client.ts';
import { captureException, setUser } from '@sentry/sveltekit';
import type { Handle } from '@sveltejs/kit';
import { and, eq } from 'drizzle-orm';
import { issueToken, rotateToken, verifyToken } from './token.ts';

type Session = NonNullable<App.Locals['session']>;

const rotateStaleToken = async (session: Session) => {
	const claimed = await db
		.update(tokenBanTable)
		.set({
			reason: 'rotate',
			effectiveAt: new Date(Date.now() + AUTH_TOKEN_ROTATE_GRACE),
		})
		.where(
			and(
				eq(tokenBanTable.tokenId, session.jti), //
				eq(tokenBanTable.reason, 'stale'),
			),
		)
		.returning({ tokenId: tokenBanTable.tokenId });

	if (!claimed.length) return;

	const user = await db.query.userTable.findFirst({
		where: { id: session.sub },
		with: {
			profile: { columns: { id: true } },
			activeRoles: { columns: { role: true } },
		},
	});

	if (!user) return;

	await issueToken({
		sub: session.sub,
		profile: !!user.profile,
		roles: new Set(user.activeRoles.map((r) => r.role)),
	});
};

export const handleJWT: Handle = async ({ event, resolve }) => {
	const jwt = event.cookies.get(AUTH_COOKIE_NAME);
	if (!jwt) return resolve(event);

	const verified = await verifyToken(jwt);

	const ban =
		verified &&
		(await silentDb.query.tokenBanTable.findFirst({
			where: { tokenId: verified.payload.jti },
			columns: { reason: true, effectiveAt: true },
		}));

	if (!verified || (ban && ban.effectiveAt <= new Date())) {
		event.cookies.delete(AUTH_COOKIE_NAME, { path: '/' });
		return resolve(event);
	}

	const session: Session = {
		jti: verified.payload.jti,
		sub: verified.payload.sub,
		profile: verified.payload.profile !== null,
		roles: new Set(verified.payload.roles),
	};

	if (ban?.reason === 'stale') await rotateStaleToken(session);

	if (!ban) {
		event.locals.session = session;
		const expiresIn = verified.payload.exp * 1000 - Date.now();
		if (expiresIn <= AUTH_TOKEN_ROTATE_THRESHOLD) await rotateToken().catch(captureException);
	}

	const userId = event.locals.session?.sub;

	if (userId) {
		setUser({ id: userId });
		event.tracing.root.setAttribute('userId', userId);
	}

	return resolve(event);
};
