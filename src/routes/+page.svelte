<script lang="ts">
	import { FormSchema } from './ids';
	import { addId, getIds } from './ids.remote';
</script>

<main class="p-8">
	<form {...addId.preflight(FormSchema)} oninput={() => addId.validate()}>
		<label class="flex flex-col *:w-fit">
			<span>UUID</span>
			<input
				{...addId.fields.uuid.as('text')}
				required
				size="36"
				autocomplete="off"
				class="font-mono"
			/>
		</label>
		<!-- eslint-disable-next-line svelte/require-each-key -->
		{#each addId.fields.uuid.issues() ?? [] as issue}
			<p>{issue.message}</p>
		{/each}
		<button
			type="button"
			onclick={() => {
				addId.fields.uuid.set(self.crypto.randomUUID());
				// FIXME Programmatically validate after setting input
				// Reference https://github.com/sveltejs/kit/issues/14630
			}}
		>
			Generate
		</button>
		<button>Submit</button>
	</form>
	<ol class="mt-8 list-decimal pl-8 font-mono">
		<!-- TODO Remove unnecessary svelte:boundary -->
		<!-- Reference github.com/sveltejs/svelte/issues/16905 -->
		<svelte:boundary>
			{#each await getIds() as id (id)}
				<li>{id}</li>
			{/each}
		</svelte:boundary>
	</ol>
</main>
