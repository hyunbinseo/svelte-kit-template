/// <reference no-default-lib="true"/>
/// <reference lib="esnext" />
/// <reference lib="webworker" />
/// <reference types="@sveltejs/kit" />
/// <reference types="../.svelte-kit/ambient.d.ts" />

import {
	build, // _app
	files, // static
	version,
} from '$service-worker';

const self = globalThis.self as unknown as ServiceWorkerGlobalScope;
const assets: ReadonlySet<string> = new Set([...build, ...files]);

self.addEventListener('install', (event) => {
	return;
	event.waitUntil(
		(async () => {
			const cache = await caches.open(version);
			await cache.addAll([]);
		})(),
	);
});

self.addEventListener('activate', (event) => {
	event.waitUntil(
		(async () => {
			for (const key of await caches.keys()) {
				if (key !== version) await caches.delete(key);
			}
		})(),
	);
});

self.addEventListener('fetch', (event) => {
	if (event.request.method !== 'GET') return;

	const url = new URL(event.request.url);
	if (!assets.has(url.pathname)) return;

	event.respondWith(
		(async () => {
			const cache = await caches.open(version);
			const cached = await cache.match(url.pathname);
			if (cached) return cached;

			const response = await fetch(event.request);
			if (response.ok) await cache.put(event.request, response.clone());
			return response;
		})(),
	);
});
