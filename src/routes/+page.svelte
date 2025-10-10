<script lang="ts">
	import { FormSchema, osArray } from './ids';
	import { addId } from './ids.remote';
</script>

<form {...addId.preflight(FormSchema)} oninput={() => addId.validate()}>
	<label>
		<span>Operating System</span>
		<select {...addId.fields.os.as('select')}>
			<!-- eslint-disable-next-line svelte/require-each-key -->
			{#each osArray as os, index}
				<option selected={!index}>{os}</option>
			{/each}
		</select>
	</label>
	<p>{addId.fields.os.value()}</p>
</form>
