<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import type { ActionData } from './$types';

	let { form }: { form: ActionData } = $props();
</script>

<Card.Root>
	<Card.Header>
		<Card.Title>Carga de estadísticas</Card.Title>
		<Card.Description>Cargar archivo de estadísticas consolidadas</Card.Description>
	</Card.Header>
	<form method="post" action="?/loadFile" enctype="multipart/form-data">
		<Card.Content>
			<Label for="file">Archivo consolidado de calificaciones</Label>
			<Input type="file" name="file" accept=".xlsx, .xls" />

			{#if form}
				{#if form.success}
					<div>{form.message}</div>
				{:else}
					<div>{form.error}</div>
				{/if}
			{/if}
		</Card.Content>
		<Card.Footer class="flex justify-between">
			<Button type="submit" variant="secondary">Cargar</Button>
		</Card.Footer>
	</form>
</Card.Root>
