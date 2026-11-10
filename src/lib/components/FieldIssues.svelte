<script lang="ts">
	let { issues }: { issues: undefined | { message: string }[] } = $props();
</script>

{#each issues ?? [] as issue (issue.message)}
	<p class="mt-1 text-sm text-red-700">{issue.message}</p>
{/each}
