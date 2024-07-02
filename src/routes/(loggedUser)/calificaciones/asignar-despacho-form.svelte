<script lang="ts">
	import * as Dialog from '$lib/components/ui/alert-dialog';
	import { Button, buttonVariants } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import * as Select from '$lib/components/ui/select';

	const {
		children,
		calificacionId,
		despachos
	}: { children: any; calificacionId: string; despachos: { id: string; nombre: string }[] } =
		$props();
</script>

<Dialog.Root>
	<Dialog.Trigger class={buttonVariants({ variant: 'outline' })}>
		{@render children()}
	</Dialog.Trigger>
	<Dialog.Content>
		<Dialog.Header>
			<Dialog.Title>Asignar calificación a despacho</Dialog.Title>
			<Dialog.Description>
				Modificar el despacho responsable de la aprobación de la calificación.
			</Dialog.Description>
		</Dialog.Header>
		<form action="?/actualizarDespacho" method="post">
			<div class="py-4">
				<Label for="despachoId">Asignar a despacho</Label>
				<Input type="hidden" name="calificacionId" value={calificacionId} />
				<Select.Root portal={null}>
					<Select.Trigger class="w-full">
						<Select.Value placeholder="Seleccione el despacho calificador" />
					</Select.Trigger>
					<Select.Content>
						<Select.Group>
							{#each despachos as d}
								<Select.Item value={d.id}>{d.nombre}</Select.Item>
							{/each}
						</Select.Group>
					</Select.Content>
					<Select.Input name="despachoId" />
				</Select.Root>
			</div>
			<Dialog.Footer>
				<Dialog.Cancel>Cancelar</Dialog.Cancel>
				<Button type="submit">Confirmar</Button>
			</Dialog.Footer>
		</form>
	</Dialog.Content>
</Dialog.Root>
