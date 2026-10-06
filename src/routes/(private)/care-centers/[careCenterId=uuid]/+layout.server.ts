import { getApp } from '#server/app.ts';
import { currentViewer, throwFailure } from '#server/request.ts';
import type { LayoutServerLoad } from './$types.ts';

export const load = (({ params }) =>
	currentViewer()
		.andThen((viewer) => getApp().careCenters.getAccess(params.careCenterId, viewer))
		.match((access) => access, throwFailure)) satisfies LayoutServerLoad;
