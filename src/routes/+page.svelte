<script lang="ts">
	import { logout } from '$lib/remote/logout.remote';

	const { data } = $props();
</script>

<main class="space-y-4 p-8">
	<p>
		<span class="font-mono underline">{data.subject}</span>
		<span>계정으로 로그인 됨</span>
	</p>
	<form
		{...logout}
		class="contents"
	>
		<button
			disabled={!!logout.pending}
			class="btn btn-primary disabled:btn-busy">로그아웃</button
		>
	</form>
</main>
