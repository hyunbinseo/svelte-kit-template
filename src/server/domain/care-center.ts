import { err, ok, type Result } from 'neverthrow';
import type { CareCenterRole } from '#lib/enums/care-center.ts';
import type { Failure } from '#server/domain/failure.ts';
import type { Viewer } from '#server/domain/viewer.ts';
import type {
	CareCenterRepository,
	NewCareCenter,
	NewCareCenterRole,
} from '#server/infrastructure/care-center.ts';
import { required } from '#server/utils.ts';

export type CareCenterAccess = {
	careCenter: { id: string; name: string; fullName: string };
	canManage: boolean;
};

export const CareCenter = {
	checkAccess(viewer: Viewer, roles: CareCenterRole[]): Result<void, Failure> {
		return viewer.isAdmin || roles.length > 0 ? ok(undefined) : err({ status: 403 });
	},

	canManage(viewer: Viewer, roles: CareCenterRole[]) {
		return viewer.isAdmin || roles.includes('admin');
	},

	checkManage(access: CareCenterAccess): Result<CareCenterAccess, Failure> {
		return access.canManage ? ok(access) : err({ status: 403 });
	},

	checkCreate(viewer: Viewer): Result<Viewer, Failure> {
		return viewer.isAdmin ? ok(viewer) : err({ status: 403 });
	},
};

export class CareCenters {
	static readonly inject = ['careCenterRepository'] as const;

	constructor(private readonly repository: CareCenterRepository) {}

	list(viewer: Viewer) {
		return ok(this.repository.findAccessible(viewer.userId, viewer.isAdmin));
	}

	getAccess(careCenterId: string, viewer: Viewer): Result<CareCenterAccess, Failure> {
		return required(this.repository.findWithViewerRoles(careCenterId, viewer.userId), {
			status: 404,
		}).andThen(({ activeUserRoles, ...careCenter }) => {
			const roles = activeUserRoles.map((row) => row.role);
			return CareCenter.checkAccess(viewer, roles).map(() => ({
				careCenter,
				canManage: CareCenter.canManage(viewer, roles),
			}));
		});
	}

	create(careCenter: NewCareCenter) {
		return ok(this.repository.insert(careCenter));
	}

	listMembers(careCenterId: string) {
		return ok(
			this.repository
				.findMembers(careCenterId)
				.map(({ user, ...row }) => ({ ...row, contact: user.contact })),
		);
	}

	assignMember(contact: string, role: Omit<NewCareCenterRole, 'userId'>): Result<void, Failure> {
		return required(this.repository.findActiveUserByContact(contact), {
			status: 404,
			message: '가입하지 않은 이메일입니다.',
		}).andThen((user): Result<void, Failure> =>
			this.repository.insertRole({ ...role, userId: user.id })
				? ok(undefined)
				: err({ status: 409, message: '이미 같은 역할이 있습니다.' }),
		);
	}
}
