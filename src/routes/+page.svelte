<script lang="ts">
	import { logout } from '$lib/remote/logout.remote';
	import { getCurrentUser } from '$lib/remote/session.remote';

	const user = $derived(await getCurrentUser());
</script>

<main class="space-y-6 p-8">
	<dl class="grid w-fit grid-cols-[max-content_auto] gap-x-6 gap-y-2">
		<dt class="font-bold">연락처</dt>
		<dd class="underline">{user.contact}</dd>
		<dt class="font-bold">식별자</dt>
		<dd class="font-mono">{user.id}</dd>
	</dl>
	<form {...logout} class="contents">
		<button disabled={!!logout.pending} class="btn btn-primary disabled:btn-busy">로그아웃</button>
	</form>
</main>
