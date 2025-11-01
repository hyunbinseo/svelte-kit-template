<script lang="ts">
	import { FormSchema } from './ids';
	import { addId, getIds } from './ids.remote';
</script>

<main>
	<section class="p-8">
		<h2 class="text-xl font-bold">Remote Functions</h2>
		<form {...addId.preflight(FormSchema)} oninput={() => addId.validate()} class="mt-4">
			<fieldset disabled={!!addId.pending} class="w-fit">
				<label>
					<span class="text-sm font-bold after:required-indicator">UUID</span>
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
				<div
					class={[
						'mt-2 flex justify-between',
						'*:rounded *:bg-blue-100 *:px-2 *:py-1 *:text-sm *:disabled:bg-gray-200',
					]}
				>
					<button
						type="button"
						onclick={() => {
							addId.fields.uuid.set(self.crypto.randomUUID());
							addId.validate();
						}}
					>
						Generate
					</button>
					<button class="disabled:after:content-['ting']">Submit</button>
				</div>
			</fieldset>
		</form>
		<ol class="mt-8 list-decimal pl-8 font-mono">
			{#each await getIds() as id (id)}
				<li>{id}</li>
			{/each}
		</ol>
	</section>
	<hr />
	<section class="p-8">
		<h2 class="text-xl font-bold">Form Controls</h2>
		<form class="mt-4 flex w-fit flex-col gap-y-4">
			<label>
				<input type="checkbox" />
				<span>Checkbox</span>
			</label>
			<label>
				<input type="radio" required />
				<span class="after:required-indicator">Radio</span>
			</label>
			<label>
				<span>Text</span>
				<input type="text" placeholder="Placeholder" />
			</label>
			<label>
				<span class="after:required-indicator">Select</span>
				<select required>
					{#each { length: 3 }, index}
						<option>Option {index + 1}</option>
					{/each}
				</select>
			</label>
		</form>
	</section>
</main>
