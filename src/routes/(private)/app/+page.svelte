<script lang="ts">
	import { resolve } from '$app/paths';
	import { logout } from '#remotes/logout.remote.ts';
	import { getCurrentUser } from './user.remote.ts';

	let { data } = $props();

	const user = $derived(await getCurrentUser());
	const json = $derived(JSON.stringify(user, null, 2));
</script>

<div class="page-container">
	<main class="page-card">
		<h1 class="font-bold">{data.title}</h1>
		<pre class="mt-4 overflow-x-auto rounded bg-slate-50 p-2 text-sm">{json}</pre>
		<nav class="mt-4 flex gap-x-4">
			<a class="btn btn-secondary" href={resolve('/')}>처음으로</a>
			<form {...logout} class="contents">
				<button class="btn btn-primary disabled:btn-busy" disabled={!!logout.pending}>
					로그아웃
				</button>
			</form>
		</nav>
	</main>
</div>
