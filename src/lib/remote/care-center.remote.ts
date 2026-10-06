import { resolve } from '$app/paths';
import { form, query } from '$app/server';
import { redirect } from '@sveltejs/kit';
import { AssignMemberSchema, CreateCareCenterSchema } from '#lib/schemas/care-center.ts';
import { UUIDSchema } from '#lib/valibot.ts';
import { getApp } from '#server/app.ts';
import { currentViewer, rejectForm, throwFailure } from '#server/request.ts';

export const getCareCenters = query(() =>
	currentViewer()
		.andThen((viewer) => getApp().careCenters.list(viewer))
		.match((careCenters) => careCenters, throwFailure),
);

export const createCareCenter = form(CreateCareCenterSchema, (input) =>
	currentViewer()
		.andThen((viewer) => getApp().createCareCenter(viewer, input))
		.match(
			({ id }) =>
				redirect(
					303,
					resolve('/(private)/care-centers/[careCenterId=uuid]/students', { careCenterId: id }),
				),
			rejectForm,
		),
);

export const getMembers = query(UUIDSchema, (careCenterId) =>
	currentViewer()
		.andThen((viewer) => getApp().listMembers(viewer, careCenterId))
		.match((members) => members, throwFailure),
);

export const assignMember = form(AssignMemberSchema, (input) =>
	currentViewer()
		.andThen((viewer) => getApp().assignMember(viewer, input))
		.match(() => getMembers(input.careCenterId).refresh(), rejectForm),
);
