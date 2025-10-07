<script lang="ts">
	import { FormSchema } from './ids';
	import { addId, getIds } from './ids.remote';
</script>

<main class="p-8">
	<form {...addId.preflight(FormSchema)} oninput={() => addId.validate()}>
		<fieldset disabled={!!addId.pending}>
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
			<div class="mt-2 flex gap-x-2">
				<button
					type="button"
					onclick={() => {
						addId.fields.uuid.set(self.crypto.randomUUID());
						addId.validate();
					}}
				>
					Generate
				</button>
				<button>Submit</button>
			</div>
		</fieldset>
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

<style lang="postcss">
	fieldset {
		button {
			padding: var(--spacing);
			background-color: var(--color-blue-100);
		}
		*:disabled {
			background-color: var(--color-gray-200);
		}
	}
</style>
