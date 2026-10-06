import { createInjector } from 'typed-inject';
import { db } from '#database/client.ts';
import * as careCenterApp from '#server/application/care-center.ts';
import * as studentApp from '#server/application/student.ts';
import { CareCenters } from '#server/domain/care-center.ts';
import { type Content, Transactions } from '#server/domain/content.ts';
import { Students } from '#server/domain/student.ts';
import type { Viewer } from '#server/domain/viewer.ts';
import { CareCenterRepository } from '#server/infrastructure/care-center.ts';
import type { Executor } from '#server/infrastructure/database.ts';
import { StudentRepository } from '#server/infrastructure/student.ts';

type Input<T extends (...args: never[]) => unknown> = Parameters<T>[3];

export type App = ReturnType<typeof createApp>;

let app: App | undefined;

export const getApp = (): App => {
	app ??= createApp();
	return app;
};

const createContent = (executor: Executor): Content => {
	const injector = createInjector()
		.provideValue('executor', executor)
		.provideClass('careCenterRepository', CareCenterRepository)
		.provideClass('studentRepository', StudentRepository)
		.provideClass('careCenters', CareCenters)
		.provideClass('students', Students);

	return {
		careCenters: injector.resolve('careCenters'),
		students: injector.resolve('students'),
	};
};

const createApp = () => {
	const injector = createInjector()
		.provideValue('db', db)
		.provideValue('createContent', createContent)
		.provideClass('transactions', Transactions);

	const { careCenters, students } = createContent(db);
	const transactions = injector.resolve('transactions');

	return {
		careCenters,

		// Care centers
		createCareCenter: (
			viewer: Viewer,
			input: Parameters<typeof careCenterApp.createCareCenter>[2],
		) => careCenterApp.createCareCenter(careCenters, viewer, input),
		listMembers: (viewer: Viewer, careCenterId: string) =>
			careCenterApp.listMembers(careCenters, viewer, careCenterId),
		assignMember: (viewer: Viewer, input: Parameters<typeof careCenterApp.assignMember>[2]) =>
			careCenterApp.assignMember(careCenters, viewer, input),

		// Students
		listStudents: (viewer: Viewer, careCenterId: string) =>
			studentApp.listStudents(careCenters, students, viewer, careCenterId),
		findDuplicateStudents: (
			viewer: Viewer,
			input: Input<typeof studentApp.findDuplicateStudents>,
		) => studentApp.findDuplicateStudents(careCenters, students, viewer, input),
		registerStudent: (viewer: Viewer, input: Input<typeof studentApp.registerStudent>) =>
			studentApp.registerStudent(careCenters, transactions, viewer, input),
		removeStudent: (viewer: Viewer, input: Input<typeof studentApp.removeStudent>) =>
			studentApp.removeStudent(careCenters, students, viewer, input),
	};
};
