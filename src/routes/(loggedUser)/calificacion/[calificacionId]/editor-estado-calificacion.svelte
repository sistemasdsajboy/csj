<script lang="ts">
	import * as AlertDialog from '$lib/components/ui/alert-dialog';
	import { Button } from '$lib/components/ui/button';
	import { Label } from '$lib/components/ui/label';
	import * as Select from '$lib/components/ui/select';
	import { Textarea } from '$lib/components/ui/textarea';
	import type { EstadoCalificacion } from '@prisma/client';

	const {
		estado,
		despachos,
		calificadorId
	}: {
		estado: EstadoCalificacion;
		despachos: { label: string; value: string }[];
		calificadorId: string | null;
	} = $props();
</script>

{#if estado === 'borrador' || estado === 'devuelta'}
	<AlertDialog.Root>
		<AlertDialog.Trigger asChild let:builder>
			<Button builders={[builder]}>Enviar a revisión</Button>
		</AlertDialog.Trigger>
		<AlertDialog.Content>
			<AlertDialog.Header>
				<AlertDialog.Title>Envío en revisión.</AlertDialog.Title>
				<AlertDialog.Description>
					Se va a enviar la calificación a revisión por parte del despacho calificador. Desea
					continuar?
				</AlertDialog.Description>
			</AlertDialog.Header>
			<form action="?/solicitarAprobacion" method="post" class="space-y-4">
				<Select.Root
					portal={null}
					selected={despachos.find(({ value }) => value === calificadorId)}
				>
					<Select.Trigger class="w-full">
						<Select.Value placeholder="Seleccione el despacho calificador" />
					</Select.Trigger>
					<Select.Content>
						<Select.Group>
							{#each despachos as d}
								<Select.Item value={d.value}>{d.label}</Select.Item>
							{/each}
						</Select.Group>
					</Select.Content>
					<Select.Input name="despachoId" />
				</Select.Root>
				<div>
					<Label for="observaciones">Observaciones</Label>
					<Textarea name="observaciones" rows={5} />
				</div>
				<AlertDialog.Footer>
					<AlertDialog.Cancel>Cancelar</AlertDialog.Cancel>
					<Button type="submit">Enviar</Button>
				</AlertDialog.Footer>
			</form>
		</AlertDialog.Content>
	</AlertDialog.Root>
{/if}

{#if estado === 'revision'}
	<AlertDialog.Root>
		<AlertDialog.Trigger asChild let:builder>
			<Button builders={[builder]}>Aprobar</Button>
		</AlertDialog.Trigger>
		<AlertDialog.Content>
			<AlertDialog.Header>
				<AlertDialog.Title>Aprobar calificación.</AlertDialog.Title>
				<AlertDialog.Description>
					Se va a actualizar el estado de la calificación a "Aprobada", con lo cual esta quedará en
					firme. Desea continuar?
				</AlertDialog.Description>
			</AlertDialog.Header>
			<AlertDialog.Footer>
				<AlertDialog.Cancel>Cancelar</AlertDialog.Cancel>
				<form action="?/aprobar" method="post">
					<Button type="submit">Aprobar</Button>
				</form>
			</AlertDialog.Footer>
		</AlertDialog.Content>
	</AlertDialog.Root>

	<AlertDialog.Root>
		<AlertDialog.Trigger asChild let:builder>
			<Button builders={[builder]} variant="outline">Devolver</Button>
		</AlertDialog.Trigger>
		<AlertDialog.Content>
			<AlertDialog.Header>
				<AlertDialog.Title>Devolver calificación.</AlertDialog.Title>
				<AlertDialog.Description>
					Se va a devolver la calificación para que sea revisada y corregida. Desea continuar?
				</AlertDialog.Description>
			</AlertDialog.Header>
			<form action="?/devolver" method="post" class="space-y-4">
				<div>
					<Label for="observaciones">Observaciones</Label>
					<Textarea name="observaciones" rows={5} />
				</div>
				<AlertDialog.Footer>
					<AlertDialog.Cancel>Cancelar</AlertDialog.Cancel>
					<Button type="submit">Devolver</Button>
				</AlertDialog.Footer>
			</form>
		</AlertDialog.Content>
	</AlertDialog.Root>
{/if}
