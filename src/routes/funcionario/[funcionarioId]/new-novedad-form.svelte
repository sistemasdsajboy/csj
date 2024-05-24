<script>
	import { Button, buttonVariants } from '$lib/components/ui/button';
	import * as Dialog from '$lib/components/ui/dialog';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { countLaborDaysBetweenDates } from '$lib/utils/dates';

	let from = $state('');
	let to = $state('');
	let days = $state(0);

	$effect(() => {
		if (from && to) {
			days = countLaborDaysBetweenDates(new Date(from), new Date(to));
		}
	});

	const typeOptions = [
		{ value: 'calamidad', label: 'Calamidad doméstica' },
		{ value: 'cierre-extraordinario', label: 'Cierre extraordinario de despacho' },
		{ value: 'comision', label: 'Comisión' },
		{ value: 'escrutinios', label: 'Escrutinios' },
		{ value: 'incapacidad', label: 'Incapacidad' },
		{ value: 'licencia', label: 'Licencia' },
		{ value: 'permiso-ejrlb', label: 'Permiso EJRLB' },
		{ value: 'permiso-sindical', label: 'Permiso sindical' },
		{ value: 'vacaciones', label: 'Vacaciones' },
		{ value: 'vacancia', label: 'Vacancia judicial' },
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

		<form method="post" action="?/addNovedad" class="grid gap-4 py-4">
			<div class="flex w-full max-w-sm flex-col gap-1.5">
				<Label for="type">Tipo de novedad</Label>

				<select required name="type">
					<option value="calamidad">Calamidad doméstica</option>
					<option value="cierre-extraordinario">Cierre extraordinario de despacho</option>
					<option value="comision">Comisión</option>
					<option value="escrutinios">Escrutinios</option>
					<option value="incapacidad">Incapacidad</option>
					<option value="licencia">Licencia</option>
					<option value="permiso-ejrlb">Permiso EJRLB</option>
					<option value="permiso-sindical">Permiso sindical</option>
					<option value="vacaciones">Vacaciones</option>
					<option value="vacancia">Vacancia judicial</option>
					<option value="vacancia">Otras novedades</option>
				</select>
			</div>
			<div class="grid grid-cols-4 items-center gap-4">
				<Label for="from" class="text-right">Desde</Label>
				<div><input type="date" name="from" required bind:value={from} /></div>
			</div>
			<div class="grid grid-cols-4 items-center gap-4">
				<Label for="to" class="text-right">Hasta</Label>
				<div><input type="date" name="to" required bind:value={to} /></div>
			</div>
			<div class="grid grid-cols-4 items-center gap-4">
				<Label for="days" class="text-right">Días</Label>
				<Input id="username" value={days} class="col-span-3" />
			</div>
			<div class="grid grid-cols-4 items-center gap-4">
				<Label for="notes" class="text-right">Descripción</Label>
				<div><input type="text" name="notes" /></div>
			</div>

			<Dialog.Footer>
				<Button type="submit">Crear novedad</Button>
			</Dialog.Footer>
		</form>
	</Dialog.Content>
</Dialog.Root>
