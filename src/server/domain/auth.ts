import { randomInt, timingSafeEqual } from 'node:crypto';
import { err, ok, type Result } from 'neverthrow';
import {
	AUTH_ALLOW_UNREGISTERED,
	AUTH_CODE_LENGTH,
	AUTH_CODE_MAX_ATTEMPTS,
	AUTH_TOKEN_ROTATE_THRESHOLD,
} from '#lib/auth/config.ts';
import type { TokenBanReason, TokenRefreshReason, TokenRevokeReason } from '#lib/enums/token.ts';
import type { UserRole } from '#lib/enums/user.ts';
import type { SendErrorCode, ValidateErrorCode } from '#lib/schemas/auth.ts';
import type { Failure } from '#server/domain/failure.ts';
import type { TokenProvider } from '#server/infrastructure/jwt.ts';
import type { LoginRepository } from '#server/infrastructure/login.ts';
import type { TokenRepository } from '#server/infrastructure/token.ts';
import type { UserRepository } from '#server/infrastructure/user.ts';

export type SessionUser = { sub: string; profile: boolean; roles: Set<UserRole> };
export type Session = SessionUser & { jti: string };
export type IssuedSession = { jwt: string; expiresAt: Date; session: Session };

export type SessionChange = { session: Session } | { issued: IssuedSession } | { cleared: true };

const sendFailure = (code: SendErrorCode, status: Failure['status']): Failure => ({ status, code });
const validateFailure = (code: ValidateErrorCode): Failure => ({ status: 400, code });

export const Login = {
	createCode() {
		return randomInt(0, Math.pow(10, AUTH_CODE_LENGTH)).toString().padStart(AUTH_CODE_LENGTH, '0');
	},

	checkAttempt(
		login: { ip: string; expiresAt: Date; attempts: { isSuccessful: boolean }[] },
		ip: string,
		now = new Date(),
	): Result<void, Failure> {
		if (login.ip !== ip) return err(validateFailure('IP_MISMATCH'));
		if (login.expiresAt < now) return err(validateFailure('CODE_EXPIRED'));

		if (
			login.attempts.length >= AUTH_CODE_MAX_ATTEMPTS ||
			login.attempts.some((attempt) => attempt.isSuccessful)
		) {
			return err(validateFailure('CODE_BLOCKED'));
		}

		return ok(undefined);
	},

	isCodeCorrect(expected: string, actual: string) {
		return timingSafeEqual(Buffer.from(expected), Buffer.from(actual));
	},
};

export const Token = {
	check(
		token: { exp: number; ban: { reason: TokenBanReason; effectiveAt: Date } | undefined },
		now = new Date(),
	): 'valid' | 'revoked' | 'stale' | 'rotate' {
		const { exp, ban } = token;

		if (ban && ban.effectiveAt <= now) return 'revoked';
		if (ban?.reason === 'stale') return 'stale';
		if (!ban && exp * 1000 - now.getTime() <= AUTH_TOKEN_ROTATE_THRESHOLD) return 'rotate';

		return 'valid';
	},
};

export class Logins {
	static readonly inject = ['loginRepository', 'userRepository'] as const;

	constructor(
		private readonly logins: LoginRepository,
		private readonly users: UserRepository,
	) {}

	start(contact: string, ip: string): Result<{ id: string; code: string }, Failure> {
		const user = this.users.findActiveByContact(contact);
		if (!user && !AUTH_ALLOW_UNREGISTERED) return err(sendFailure('UNREGISTERED', 403));

		const pending = this.logins.findLatestPending(contact);
		if (pending && !pending.successfulAttempts.length) {
			return err(sendFailure('RATE_LIMITED', 409));
		}

		const code = Login.createCode();
		const id = this.logins.insert({ contact, userId: user?.id ?? null, code, ip });

		return ok({ id, code });
	}

	markSent(id: string, sendId: string) {
		this.logins.setSendId(id, sendId);
	}

	discard(id: string) {
		this.logins.delete(id);
	}

	verify(
		input: { id: string; contact: string; code: string },
		ip: string,
	): Result<SessionUser, Failure> {
		const login = this.logins.findForVerification(input.id, input.contact);
		if (!login) return err({ status: 400 });

		const checked = Login.checkAttempt(login, ip);
		if (checked.isErr()) return err(checked.error);

		const isCorrect = Login.isCodeCorrect(login.code, input.code);
		this.logins.insertAttempt(input.id, isCorrect, ip);
		if (!isCorrect) return err(validateFailure('CODE_INVALID'));

		const userId = login.activeUserByContact?.id;
		if (login.userId && login.userId !== userId) return err(validateFailure('USER_DEACTIVATED'));
		if (!userId && !AUTH_ALLOW_UNREGISTERED) return err({ status: 403 });

		const id = userId ?? this.users.insert(input.contact);
		if (!login.userId) this.logins.linkUser(input.id, id);

		const user = this.users.findActiveWithAccess(id);
		if (!user) return err({ status: 500 });

		return ok({
			sub: user.id,
			profile: !!user.profile,
			roles: new Set(user.activeRoles.map((row) => row.role)),
		});
	}
}

export class Sessions {
	static readonly inject = ['tokenRepository', 'tokenProvider', 'userRepository'] as const;

	constructor(
		private readonly tokens: TokenRepository,
		private readonly provider: TokenProvider,
		private readonly users: UserRepository,
	) {}

	// BLOCKED Use transaction for atomic ban + token issuing.
	async issue(
		user: SessionUser,
		ip: string,
		refresh?: { from: string; reason: TokenRefreshReason },
	): Promise<IssuedSession> {
		const token = this.tokens.insert({
			userId: user.sub,
			refreshedFrom: refresh?.from,
			refreshReason: refresh?.reason,
			ip,
		});

		const jwt = await this.provider.sign(token, user);
		return { jwt, expiresAt: token.expiresAt, session: { jti: token.id, ...user } };
	}

	async rotate(
		session: Pick<Session, 'jti' | 'sub'>,
		reason: TokenRefreshReason,
		ip: string,
	): Promise<IssuedSession | 'unchanged' | 'cleared'> {
		if (reason !== 'stale' && !this.tokens.claimRotation(session.jti, session.sub, ip)) {
			return 'unchanged';
		}

		const user = this.users.findActiveWithAccess(session.sub);
		if (!user) return 'cleared';

		return this.issue(
			{
				sub: session.sub,
				profile: !!user.profile,
				roles: new Set(user.activeRoles.map((row) => row.role)),
			},
			ip,
			{ from: session.jti, reason },
		);
	}

	revoke(session: Pick<Session, 'jti' | 'sub'>, reason: TokenRevokeReason, ip: string) {
		this.tokens.revoke(session.jti, reason, session.sub, ip);
	}

	async authenticate(
		jwt: string,
		ip: string,
		onRotateError: (e: unknown) => void,
	): Promise<SessionChange> {
		const payload = await this.provider.verify(jwt);
		const check =
			payload && Token.check({ exp: payload.exp, ban: this.tokens.findBan(payload.jti) });

		if (!payload || check === 'revoked') return { cleared: true };

		const session: Session = {
			jti: payload.jti,
			sub: payload.sub,
			profile: payload.profile !== null,
			roles: new Set(payload.roles),
		};

		if (check === 'stale') return toChange(await this.rotate(session, 'stale', ip), session);

		if (check === 'rotate') {
			// Error can be swallowed; session is valid for this request.
			const rotated = await this.rotate(session, 'threshold', ip).catch((e: unknown) => {
				onRotateError(e);
				return 'unchanged' as const;
			});
			return toChange(rotated, session);
		}

		return { session };
	}
}

const toChange = (
	rotated: IssuedSession | 'unchanged' | 'cleared',
	session: Session,
): SessionChange => {
	if (rotated === 'cleared') return { cleared: true };
	if (rotated === 'unchanged') return { session };
	return { issued: rotated };
};
