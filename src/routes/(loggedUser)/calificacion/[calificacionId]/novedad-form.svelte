<script lang="ts">
	import { Button, buttonVariants } from '$lib/components/ui/button';
	import * as Dialog from '$lib/components/ui/dialog';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import * as Select from '$lib/components/ui/select';
	import { Textarea } from '$lib/components/ui/textarea';
	import { contarDiasHabiles } from '$lib/utils/dates';
	import type { NovedadFuncionario } from '@prisma/client';
	import PencilIcon from 'lucide-svelte/icons/pencil';

	const {
		diasNoHabiles,
		despachoId,
		novedad = null,
	}: {
		diasNoHabiles: Record<string, number[]>;
		despachoId: string;
		// Cuando llega una novedad el formulario edita esa; si no, crea una nueva.
		novedad?: NovedadFuncionario | null;
	} = $props();

	const esEdicion = !!novedad;
	const soloFecha = (d: Date) => new Date(d).toISOString().slice(0, 10);

	let from = $state(novedad ? soloFecha(novedad.from) : '');
	let to = $state(novedad ? soloFecha(novedad.to) : '');
	let dias = $state(novedad?.days ?? 0);
	let diasDescontables = $state(novedad?.diasDescontables ?? 0);

	$effect(() => {
		if (from && to) {
			dias = contarDiasHabiles(diasNoHabiles, new Date(from), new Date(to));
			// Al crear, los descontables arrancan igual a los días hábiles. Al
			// editar NO se tocan: el número guardado suele ser justo el que se
			// viene a corregir, y sobreescribirlo borraría la corrección.
			if (!esEdicion) diasDescontables = dias;
		}
	});

	const tiposNovedad = [
		{ value: 'calamidad', label: 'Calamidad doméstica' },
		{ value: 'cierre-extraordinario', label: 'Cierre extraordinario de despacho' },
		{ value: 'comision', label: 'Comisión' },
		{ value: 'escrutinios', label: 'Escrutinios' },
		{ value: 'incapacidad', label: 'Incapacidad' },
		{ value: 'licencia', label: 'Licencia' },
		{ value: 'permiso-ejrlb', label: 'Permiso EJRLB' },
		{ value: 'permiso-sindical', label: 'Permiso sindical' },
		{ value: 'vacaciones', label: 'Vacaciones' },
		{ value: 'otras', label: 'Otras novedades' },
	];

	const tipoSeleccionado = novedad ? tiposNovedad.find((t) => t.value === novedad.type) : undefined;
</script>

<Dialog.Root>
	{#if esEdicion}
		<Dialog.Trigger class={buttonVariants({ variant: 'ghost', size: 'icon' })} title="Editar novedad">
			<PencilIcon class="h-4 w-4" />
		</Dialog.Trigger>
	{:else}
		<Dialog.Trigger class={buttonVariants({ variant: 'outline' })}>Agregar novedad</Dialog.Trigger>
	{/if}

	<Dialog.Content class="sm:max-w-[425px]">
		<Dialog.Header>
			<Dialog.Title>{esEdicion ? 'Editar novedad de funcionario' : 'Nueva novedad de funcionario'}</Dialog.Title>
			<Dialog.Description>Registro de novedades para el cálculo de días laborados.</Dialog.Description>
		</Dialog.Header>

		<form method="post" action={esEdicion ? '?/editarNovedad' : '?/addNovedad'}>
			<div class="grid items-center gap-2 pb-2 sm:grid-cols-[1fr_2fr]">
				<input type="hidden" name="despachoId" value={despachoId} />
				{#if esEdicion}
					<input type="hidden" name="novedadId" value={novedad?.id} />
				{/if}

				<Label for="type">Tipo de novedad</Label>
				<Select.Root portal={null} selected={tipoSeleccionado}>
					<Select.Trigger class="w-full">
						<Select.Value />
					</Select.Trigger>
					<Select.Content>
						<Select.Group>
							{#each tiposNovedad as d}
								<Select.Item value={d.value} label={d.label} />
							{/each}
						</Select.Group>
					</Select.Content>
					<Select.Input name="type" required />
				</Select.Root>

				<Label for="from">Desde</Label>
				<Input type="date" name="from" required bind:value={from} />

				<Label for="to">Hasta</Label>
				<Input type="date" name="to" required bind:value={to} />

				<Label for="dias">Días hábiles</Label>
				<Input id="dias" name="dias" value={dias} />

				<Label for="diasDescontables">Días descontables</Label>
				<Input id="diasDescontables" name="diasDescontables" value={diasDescontables} />

				<Label for="notes">Descripción</Label>
				<Textarea name="notes" value={novedad?.notes ?? ''} />
			</div>

			<Dialog.Footer>
				<Button type="submit">{esEdicion ? 'Guardar cambios' : 'Crear novedad'}</Button>
			</Dialog.Footer>
		</form>
	</Dialog.Content>
</Dialog.Root>
