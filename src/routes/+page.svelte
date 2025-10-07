<script lang="ts">
	import { FormSchema } from './ids';
	import { addId } from './ids.remote';
</script>

<form {...addId.preflight(FormSchema)}>
	<label>
		<span>UUID</span>
		<br />
		<input {...addId.fields.uuid.as('text')} />
	</label>
	<!-- eslint-disable-next-line svelte/require-each-key -->
	{#each addId.fields.uuid.issues() ?? [] as issue}
		<p>{issue.message}</p>
	{/each}
	<br />
	<button
		type="button"
		onclick={() => {
			addId.fields.uuid.set(self.crypto.randomUUID());
			addId.validate();
		}}
	>
		Generate
	</button>
	<br />
	<button>Submit</button>
</form>
