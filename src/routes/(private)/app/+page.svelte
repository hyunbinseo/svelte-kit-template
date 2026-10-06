<script lang="ts">
	import { getCurrentUser, logout } from '#lib/remote/auth.remote.ts';

	const user = $derived(await getCurrentUser());
</script>

<main class="p-8">
	<dl
		class="grid w-fit grid-cols-[max-content_auto] gap-x-4 gap-y-2 [&_dt]:text-right [&_dt]:font-bold"
	>
		<dt>식별자</dt>
		<dd class="font-mono">{user.id}</dd>
		<dt>연락처</dt>
		<dd>{user.contact}</dd>
		<dt>생년월일</dt>
		<dd>
			<time datetime={user.profile.birth}>{user.profile.birth}</time>
		</dd>
	</dl>
	<form {...logout} class="contents">
		<button class="mt-8 btn btn-primary disabled:btn-busy" disabled={!!logout.pending}>
			로그아웃
		</button>
	</form>
</main>
