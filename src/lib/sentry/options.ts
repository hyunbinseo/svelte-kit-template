import type { NodeOptions } from '@sentry/node';

// Shared by the client, server, and CLI, which add dsn, environment, and release.
// See https://docs.sentry.io/platforms/javascript/guides/sveltekit/data-management/data-collected/
export const sentryOptions = {
	// Console output can hold values, e.g. a failed parse's input.
	beforeBreadcrumb: (breadcrumb) => (breadcrumb.category === 'console' ? null : breadcrumb),
	// SvelteKit's root span keeps the full URL (`http.url`); urlQueryParams doesn't cover it.
	beforeSendSpan: (span) => {
		const url = span.attributes['http.url'];
		if (typeof url === 'string') span.attributes['http.url'] = url.replace(/[?#].*/s, '');
		return span;
	},
	dataCollection: {
		cookies: false,
		databaseQueryData: false,
		genAI: { inputs: false, outputs: false },
		graphQL: { document: false, variables: false },
		httpBodies: [],
		// Others are sent as [Filtered]. User-Agent shows the browser and OS.
		httpHeaders: { allow: ['user-agent'] },
		mcp: { inputs: false, outputs: false },
		queues: false,
		stackFrameVariables: false,
		urlQueryParams: false,
		// IPs and inferred user fields; setUser still sets the user ID.
		userInfo: false,
	},
	tracesSampleRate: 0.1,
} satisfies NodeOptions;
