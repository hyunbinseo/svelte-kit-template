<script module>
	export { formIssues };
</script>

<script lang="ts">
	import type { RemoteFormIssue } from '@sveltejs/kit';
	import { slide } from 'svelte/transition';
</script>

{#snippet formIssues(issues: RemoteFormIssue[] | undefined, maxLength = 1)}
	<ul class="text-sm text-red-600 *:mt-2 *:truncate">
		<!-- eslint-disable-next-line svelte/require-each-key -->
		{#each issues?.slice(0, maxLength) as issue}
			<li transition:slide>{issue.message}</li>
		{/each}
	</ul>
{/snippet}
