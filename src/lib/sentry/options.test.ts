import { expect, test } from 'vite-plus/test';
import { sentryOptions } from '#lib/sentry/options.ts';

type Span = Parameters<typeof sentryOptions.beforeSendSpan>[0];

const createSpan = (attributes: Span['attributes']): Span => ({
	attributes,
	is_segment: true,
	name: 'sveltekit.handle.root',
	span_id: '0',
	start_timestamp: 0,
	status: 'ok',
	trace_id: '0',
});

test.for([
	['https://example.com/login?returnTo=%2Faccount', 'https://example.com/login'],
	['https://example.com/a#b', 'https://example.com/a'],
	['https://example.com/a', 'https://example.com/a'],
])('strips the query and hash from http.url: %s', ([url, expected]) => {
	const span = sentryOptions.beforeSendSpan(createSpan({ 'http.url': url }));
	expect(span.attributes['http.url']).toBe(expected);
});

test('drops console breadcrumbs', () => {
	expect(sentryOptions.beforeBreadcrumb({ category: 'console', message: 'input' })).toBeNull();
	expect(sentryOptions.beforeBreadcrumb({ category: 'navigation' })).toEqual({
		category: 'navigation',
	});
});
