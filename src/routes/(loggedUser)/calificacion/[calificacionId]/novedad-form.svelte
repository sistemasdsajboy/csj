<script lang="ts">
	import { Button, buttonVariants } from '$lib/components/ui/button';
	import * as Dialog from '$lib/components/ui/dialog';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import * as Select from '$lib/components/ui/select';
	import { Textarea } from '$lib/components/ui/textarea';
	import { contarDiasHabiles } from '$lib/utils/dates';

	let from = $state('');
	let to = $state('');
	let dias = $state(0);
	let diasDescontables = $state(0);

	const {
		diasNoHabiles,
		despachoId
	}: { diasNoHabiles: Record<string, number[]>; despachoId: string } = $props();

	$effect(() => {
		if (from && to) {
			dias = contarDiasHabiles(diasNoHabiles, new Date(from), new Date(to));
			diasDescontables = dias;
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
		{ value: 'otras', label: 'Otras novedades' }
	];
</script>

<Dialog.Root>
	<Dialog.Trigger class={buttonVariants({ variant: 'outline' })}>Agregar novedad</Dialog.Trigger>
	<Dialog.Content class="sm:max-w-[425px]">
		<Dialog.Header>
			<Dialog.Title>Nueva novedad de funcionario</Dialog.Title>
			<Dialog.Description>
				Registro de novedades para el cálculo de días laborados.
			</Dialog.Description>
		</Dialog.Header>

		<form method="post" action="?/addNovedad">
			<div class="grid items-center gap-2 pb-2 sm:grid-cols-[1fr_2fr]">
				<input type="hidden" name="despachoId" value={despachoId} />
				<Label for="type">Tipo de novedad</Label>
				<Select.Root portal={null}>
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
				<Textarea name="notes" />
			</div>

			<Dialog.Footer>
				<Button type="submit">Crear novedad</Button>
			</Dialog.Footer>
		</form>
	</Dialog.Content>
</Dialog.Root>
