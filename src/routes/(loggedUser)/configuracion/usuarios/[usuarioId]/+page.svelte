<script lang="ts">
	import * as Form from '$lib/components/ui/form';
	import { superForm } from 'sveltekit-superforms';
	import { zodClient } from 'sveltekit-superforms/adapters';
	import { updateUserFormSchema } from './validation';

	const { data } = $props();
	const { updateUserForm, roles, despachos } = data;

	const form = superForm(updateUserForm, {
		validators: zodClient(updateUserFormSchema)
	});
	const { form: formData } = form;
</script>

<form method="post">
	<div class="grid w-full items-center gap-4">
		<div class="text-xl">Usuario {$formData.username}</div>

		<input type="hidden" name="id" value={$formData.id} />

		<Form.Field {form} name="roles">
			<Form.Control let:attrs>
				<Form.Label for="roles">Roles de usuario</Form.Label>
				{#each roles as rol}
					{@const checked = $formData.roles.includes(rol.value)}
					<div class="flex flex-row items-center gap-2">
						<input type="checkbox" bind:group={$formData.roles} name="roles" value={rol.value} />
						<!-- 
						// TODO: This way "roles" is not sent to the server action and is always an empty array.
						<Checkbox
							{...attrs}
							{checked}
							onCheckedChange={() => {
								$formData.roles = $formData.roles.includes(rol.value) ?
									$formData.roles.filter((i) => i !== rol.value) :
									$formData.roles = [...$formData.roles, rol.value];
							}}
						/> -->
						<Form.Label for="roles">{rol.label}</Form.Label>
					</div>
				{/each}
			</Form.Control>
			<Form.FieldErrors />
		</Form.Field>

		<Form.Field {form} name="despachosSeccionalIds">
			<Form.Control let:attrs>
				<Form.Label for="despachosSeccionalIds">Despachos</Form.Label>
				{#each despachos as despacho}
					{@const checked = $formData.despachosSeccionalIds.includes(despacho.value)}
					<div class="flex flex-row items-center gap-2">
						<input
							type="checkbox"
							bind:group={$formData.despachosSeccionalIds}
							name="despachosSeccionalIds"
							value={despacho.value}
						/>
						<Form.Label for="despachosSeccionalIds">{despacho.label}</Form.Label>
					</div>
				{/each}
			</Form.Control>
			<Form.FieldErrors />
		</Form.Field>

		<Form.FormButton type="submit">Guardar</Form.FormButton>
	</div>
</form>
