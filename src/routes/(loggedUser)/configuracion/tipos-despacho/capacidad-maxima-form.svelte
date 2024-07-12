<script lang="ts">
	import { Button, buttonVariants } from '$lib/components/ui/button';
	import * as Dialog from '$lib/components/ui/dialog';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import type { Snippet } from 'svelte';

	const { tipoDespachoId, children }: { tipoDespachoId: string; children: Snippet } = $props();
</script>

<Dialog.Root>
	<Dialog.Trigger class={buttonVariants({ variant: 'outline' })}>
		{@render children()}
	</Dialog.Trigger>
	<Dialog.Content>
		<Dialog.Header>
			<Dialog.Title>Capacidad máxima de respuesta</Dialog.Title>
		</Dialog.Header>
		<form action="?/guardarCapacidadMaxima" method="post" class="grid grid-cols-[1fr_2fr] gap-2">
			<Input type="hidden" name="tipoDespachoId" value={tipoDespachoId} />

			<Label for="periodo">Periodo</Label>
			<Input type="number" name="periodo" required />

			<Label for="cantidad">Cantidad</Label>
			<Input type="number" name="cantidad" required />

			<Dialog.Footer class="col-span-2">
				<Button type="submit">Agregar</Button>
			</Dialog.Footer>
		</form>
	</Dialog.Content>
</Dialog.Root>
