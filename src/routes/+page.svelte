<script lang="ts">
	import { logout } from '#lib/remotes/logout.remote.ts';
	import { resolve } from '$app/paths';
	import { getSelf } from './get-self.remote.ts';

	const user = $derived(await getSelf());
</script>

<main class="p-8">
	{#if !user}
		<a class="btn btn-primary" href={resolve('/login')}>로그인</a>
	{:else}
		<dl
			class="grid w-fit grid-cols-[max-content_auto] gap-x-4 gap-y-2 [&_dt]:text-right [&_dt]:font-bold"
		>
			<dt>식별자</dt>
			<dd class="font-mono">{user.id}</dd>
			<dt>연락처</dt>
			<dd>{user.contact}</dd>
			{#if user.profile}
				<dt>생년월일</dt>
				<dd>
					<time datetime={user.profile.birth}>{user.profile.birth}</time>
				</dd>
			{/if}
		</dl>
		<form {...logout} class="contents">
			<button disabled={!!logout.pending} class="mt-8 btn btn-primary disabled:btn-busy">
				로그아웃
			</button>
		</form>
	{/if}
</main>
