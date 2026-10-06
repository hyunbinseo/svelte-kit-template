import assert from 'node:assert/strict';
import { test } from 'vite-plus/test';
import { CareCenter } from './care-center.ts';

const admin = { userId: 'a', isAdmin: true };
const user = { userId: 'u', isAdmin: false };

test('CareCenter - 시스템 관리자는 모든 센터에 접근하고 관리한다', () => {
	assert(CareCenter.checkAccess(admin, []).isOk());
	assert(CareCenter.canManage(admin, []));
});

test('CareCenter - 센터 직원은 접근만 하고 관리하지 못한다', () => {
	assert(CareCenter.checkAccess(user, ['staff']).isOk());
	assert(!CareCenter.canManage(user, ['staff']));
});

test('CareCenter - 센터 관리자는 접근하고 관리한다', () => {
	assert(CareCenter.checkAccess(user, ['admin']).isOk());
	assert(CareCenter.canManage(user, ['admin']));
});

test('CareCenter - 역할이 없으면 접근하지 못한다', () => {
	assert.deepEqual(CareCenter.checkAccess(user, [])._unsafeUnwrapErr(), { status: 403 });
});

test('CareCenter - 시스템 관리자만 센터를 등록한다', () => {
	assert(CareCenter.checkCreate(admin).isOk());
	assert(CareCenter.checkCreate(user).isErr());
});
