import type { NodeOptions } from '@sentry/sveltekit';

// See https://blog.sentry.io/datacollection-control-panel/
// See https://docs.sentry.io/platforms/javascript/migration/v10-to-v11/#data-collection

const deny = ['forwarded', '-ip', 'remote-', 'via', '-user'];

export const dataCollection = {
	userInfo: false,
	cookies: false,
	httpHeaders: {
		request: { deny },
		response: { deny },
	},
	httpBodies: [],
	urlQueryParams: { deny },
	genAI: { inputs: false, outputs: false },
	databaseQueryData: false,
	graphQL: { document: false, variables: false },
} satisfies NodeOptions['dataCollection'];
