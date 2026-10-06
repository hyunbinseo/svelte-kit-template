import assert from 'node:assert/strict';
import { test } from 'vite-plus/test';
import { CareCenter } from './domain.ts';

test('CareCenter - 시스템 관리자는 모든 센터에 접근하고 관리한다', () => {
	const viewer = { isAdmin: true, roles: [] };
	assert(CareCenter.canAccess(viewer));
	assert(CareCenter.canManage(viewer));
});

test('CareCenter - 센터 직원은 접근만 하고 관리하지 못한다', () => {
	const viewer = { isAdmin: false, roles: ['staff' as const] };
	assert(CareCenter.canAccess(viewer));
	assert(!CareCenter.canManage(viewer));
});

test('CareCenter - 센터 관리자는 접근하고 관리한다', () => {
	const viewer = { isAdmin: false, roles: ['admin' as const] };
	assert(CareCenter.canAccess(viewer));
	assert(CareCenter.canManage(viewer));
});

test('CareCenter - 역할이 없으면 접근하지 못한다', () => {
	assert(!CareCenter.canAccess({ isAdmin: false, roles: [] }));
});
