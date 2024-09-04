<script lang="ts">
	import * as Select from '$lib/components/ui/select';
	import { PencilIcon, PlusIcon } from 'lucide-svelte';
	import CapacidadMaximaForm from './capacidad-maxima-form.svelte';
	import TipoDespachoForm from './tipo-despacho-form.svelte';

	const { data, form } = $props();
	const { tiposDespacho, especialidades, categorias } = data;

	let tipoDespachoId = $state('');
	let tipoDespacho = $state<(typeof tiposDespacho)[number] | null>(null);
	let capacidadesMaximas: (typeof tiposDespacho)[number]['capacidadesMaximas'] = $state([]);

	$effect(() => {
		tipoDespacho = tiposDespacho.find((td) => td.id === tipoDespachoId) || null;
	});

	$effect(() => {
		capacidadesMaximas = tipoDespacho?.capacidadesMaximas || [];
	});
</script>

<div class="flex w-full max-w-sm flex-col gap-4">
	<h3 class=" text-lg font-bold">Tipos de despacho</h3>

	<div class="flex flex-row gap-4">
		<Select.Root
			portal={null}
			onSelectedChange={(selected) => {
				console.log({ selected });
				tipoDespachoId = selected?.value?.toString() || '';
			}}
		>
			<Select.Trigger class="w-full">
				<Select.Value placeholder="Seleccione el tipo de despacho" />
			</Select.Trigger>
			<Select.Content>
				<Select.Group>
					<Select.Item value="">Nuevo tipo de despacho</Select.Item>
					{#each tiposDespacho as td}
						<Select.Item value={td.id}>{td.nombre}</Select.Item>
					{/each}
				</Select.Group>
			</Select.Content>
		</Select.Root>

		<TipoDespachoForm tipoDespacho={null} {especialidades} {categorias} {form}>
			<PlusIcon class=" mt-1 h-4 w-4" />
		</TipoDespachoForm>

		{#if tipoDespacho}
			<TipoDespachoForm {tipoDespacho} {especialidades} {categorias} {form}>
				<PencilIcon class=" mt-1 h-4 w-4" />
			</TipoDespachoForm>
		{/if}
	</div>

	{#if capacidadesMaximas.length !== 0}
		<h3 class=" text-lg font-bold">Capacidad máxima de respuesta</h3>
		<div class="grid grid-cols-[1fr_1fr_auto]">
			<div class="font-bold">Periodo</div>
			<div class="font-bold">Cantidad</div>
			<div></div>
			{#each capacidadesMaximas as capacidad}
				<div>{capacidad.periodo}</div>
				<div>{capacidad.cantidad}</div>
				<div></div>
			{/each}
		</div>
	{:else}
		<div class="text-slate-600">Sin registros de capacidad máxima registradas para el tipo de despacho.</div>
	{/if}

	<CapacidadMaximaForm {tipoDespachoId}>Agregar capacidad máxima</CapacidadMaximaForm>
</div>
