<script module>
	export { formIssues };
</script>

<script lang="ts">
	import type { RemoteFormIssue } from '@sveltejs/kit';
	import { slide } from 'svelte/transition';
</script>

{#snippet formIssues(issues: RemoteFormIssue[] | undefined, maxLength = 1)}
	{#if issues?.length}
		<ul class="*:mt-2 *:truncate *:text-sm *:text-red-600">
			<!-- eslint-disable-next-line svelte/require-each-key -->
			{#each issues as issue, index}
				{#if index < maxLength}
					<li transition:slide|global>{issue.message}</li>
				{/if}
			{/each}
		</ul>
	{/if}
{/snippet}
