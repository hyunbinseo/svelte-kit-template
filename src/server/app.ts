import { JWT_SECRET_NEW, JWT_SECRET_OLD } from '$app/env/private';
import { createInjector } from 'typed-inject';
import { db, silentDb } from '#database/client.ts';
import * as authApp from '#server/application/auth.ts';
import * as careCenterApp from '#server/application/care-center.ts';
import * as studentApp from '#server/application/student.ts';
import { Logins, type Session, Sessions } from '#server/domain/auth.ts';
import { CareCenters } from '#server/domain/care-center.ts';
import { type Content, Transactions } from '#server/domain/content.ts';
import { Students } from '#server/domain/student.ts';
import { Accounts } from '#server/domain/user.ts';
import type { Viewer } from '#server/domain/viewer.ts';
import { CareCenterRepository } from '#server/infrastructure/care-center.ts';
import type { Executor } from '#server/infrastructure/database.ts';
import { TokenProvider } from '#server/infrastructure/jwt.ts';
import { LoginRepository } from '#server/infrastructure/login.ts';
import { StudentRepository } from '#server/infrastructure/student.ts';
import { TokenRepository } from '#server/infrastructure/token.ts';
import { UserRepository } from '#server/infrastructure/user.ts';

type Input<T extends (...args: never[]) => unknown, I extends number = 3> = Parameters<T>[I];

export type App = ReturnType<typeof createApp>;

let app: App | undefined;

export const getApp = (): App => {
	app ??= createApp();
	return app;
};

const encoder = new TextEncoder();

const createContent = (executor: Executor): Content => {
	const injector = createInjector()
		.provideValue('executor', executor)
		.provideClass('userRepository', UserRepository)
		.provideClass('loginRepository', LoginRepository)
		.provideClass('careCenterRepository', CareCenterRepository)
		.provideClass('studentRepository', StudentRepository)
		.provideClass('accounts', Accounts)
		.provideClass('logins', Logins)
		.provideClass('careCenters', CareCenters)
		.provideClass('students', Students);

	return {
		accounts: injector.resolve('accounts'),
		logins: injector.resolve('logins'),
		careCenters: injector.resolve('careCenters'),
		students: injector.resolve('students'),
	};
};

const createApp = () => {
	const injector = createInjector()
		.provideValue('db', db)
		.provideValue('executor', db)
		.provideValue('silentExecutor', silentDb)
		.provideValue('jwtSecrets', {
			current: encoder.encode(JWT_SECRET_NEW),
			previous: JWT_SECRET_OLD ? encoder.encode(JWT_SECRET_OLD) : undefined,
		})
		.provideValue('createContent', createContent)
		.provideClass('tokenRepository', TokenRepository)
		.provideClass('tokenProvider', TokenProvider)
		.provideClass('userRepository', UserRepository)
		.provideClass('sessions', Sessions)
		.provideClass('transactions', Transactions);

	const content = createContent(db);
	const { accounts, careCenters, students } = content;
	const sessions = injector.resolve('sessions');
	const transactions = injector.resolve('transactions');

	return {
		accounts,
		careCenters,
		sessions,

		// Authentication
		sendCode: (contact: string, ip: string) => authApp.sendCode(transactions, content, contact, ip),
		validateCode: (input: Input<typeof authApp.validateCode, 2>, ip: string) =>
			authApp.validateCode(transactions, sessions, input, ip),
		setupProfile: (session: Session, birth: Input<typeof authApp.setupProfile>, ip: string) =>
			authApp.setupProfile(content, sessions, session, birth, ip),

		// Care centers
		createCareCenter: (viewer: Viewer, input: Input<typeof careCenterApp.createCareCenter, 2>) =>
			careCenterApp.createCareCenter(careCenters, viewer, input),
		listMembers: (viewer: Viewer, careCenterId: string) =>
			careCenterApp.listMembers(careCenters, viewer, careCenterId),
		assignMember: (viewer: Viewer, input: Input<typeof careCenterApp.assignMember, 2>) =>
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
