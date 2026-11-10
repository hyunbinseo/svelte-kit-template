<script lang="ts">
	import { logout } from '#lib/auth/logout.remote.ts';
	import { getCurrentUser } from '#routes/(user)/remote.ts';
	import { resolve } from '$app/paths';
	import type { LayoutProps } from './$types.ts';

	let { children }: LayoutProps = $props();

	const user = $derived(await getCurrentUser());
</script>

<header class="flex items-center justify-between gap-4 bg-white px-4 py-2 shadow-sm">
	<a class="truncate text-sm" href={resolve('account')}>{user.contact}</a>
	<form {...logout} class="shrink-0">
		<button class="btn btn-secondary disabled:btn-busy" disabled={!!logout.pending}>
			로그아웃
		</button>
	</form>
</header>

{@render children()}
