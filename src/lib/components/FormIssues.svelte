<script module>
	export { formIssues };
</script>

<script lang="ts">
	import type { RemoteFormIssue } from '@sveltejs/kit';
	import { slide } from 'svelte/transition';
</script>

{#snippet formIssues(issues: RemoteFormIssue[] | undefined)}
	<ul class="mt-2 text-sm text-red-600 *:truncate *:not-first:mt-2">
		<!-- eslint-disable-next-line svelte/require-each-key -->
		{#each issues as issue}
			<li transition:slide>{issue.message}</li>
		{/each}
	</ul>
{/snippet}
