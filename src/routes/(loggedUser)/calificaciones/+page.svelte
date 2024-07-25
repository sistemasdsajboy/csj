<script lang="ts">
	import PageLayout from '$lib/components/custom/page-layout.svelte';
	import { Badge } from '$lib/components/ui/badge';
	import * as Card from '$lib/components/ui/card';
	import { Label } from '$lib/components/ui/label';
	import * as Select from '$lib/components/ui/select';
	import * as Tabs from '$lib/components/ui/tabs';
	import type { ActionData, PageData } from './$types';
	import CargaXlsxEstadisticasForm from './carga-xlsx-estadisticas-form.svelte';
	import SeleccionFuncionario from './seleccion-funcionario.svelte';

	const { data, form }: { data: PageData; form: ActionData } = $props();
	let estado = $state<string>(data.estadoPorDefecto);
	let calificaciones = $state<typeof data.calificaciones>([]);
	let despachoId = $state<string>('todos');
	let funcionarioId = $state<string | null>(null);

	$effect(() => {
		calificaciones = data.calificaciones.filter(
			(c) =>
				c.estado === estado &&
				(despachoId !== 'todos' ? c.despachoSeccional?.id === despachoId : true)
		);
	});

	const labels = {
		borrador: 'Borrador',
		revision: 'Para revisar',
		aprobada: 'Aprobada',
		devuelta: 'Devuelta'
	};
</script>

{#snippet header()}
	<h1 class="grow text-lg font-bold uppercase">Calificaciones</h1>
{/snippet}

{#snippet sidebar()}
	<div class="flex max-w-md flex-col gap-2 pt-10">
		<Badge variant="secondary" class="m-auto text-center">
			{calificaciones.length}
			{calificaciones.length === 1 ? 'calificación' : 'calificaciones'}
		</Badge>

		{#if data.despachosCalificadores.length > 1}
			<Card.Root>
				<Card.Header>
					<Card.Title>Filtrar calificaciones</Card.Title>
				</Card.Header>
				<Card.Content>
					<Label for="despachoId">Despacho</Label>
					<Select.Root
						onSelectedChange={(selected) => (despachoId = selected?.value?.toString() ?? 'todos')}
						selected={data.despachosCalificadores.find((d) => d.value === despachoId)}
					>
						<Select.Trigger class="w-full">
							<Select.Value />
						</Select.Trigger>
						<Select.Content>
							<Select.Group>
								{#each data.despachosCalificadores as d}
									<Select.Item value={d.value}>{d.label}</Select.Item>
								{/each}
							</Select.Group>
						</Select.Content>
						<Select.Input name="despachoId" />
					</Select.Root>
				</Card.Content>
			</Card.Root>
		{/if}

		<CargaXlsxEstadisticasForm {form} />

		<SeleccionFuncionario bind:funcionarioId funcionarios={data.funcionarios}
		></SeleccionFuncionario>
	</div>
{/snippet}

<PageLayout {header} {sidebar} username={data.user}>
	<Tabs.Root value={data.estadoPorDefecto} class="w-full" onValueChange={(e) => (estado = e || '')}>
		<Tabs.List class="flex w-full justify-between">
			{#each data.estados as e}
				<Tabs.Trigger value={e} class="flex w-full gap-2 ">
					{labels[e]}
				</Tabs.Trigger>
			{/each}
		</Tabs.List>
		<Tabs.Content value={estado}>
			{#each calificaciones as calificacion}
				<a
					href="/calificacion/{calificacion.id}"
					class="grid grid-cols-[160px_1fr] items-center justify-start gap-2 p-2 hover:bg-slate-100"
				>
					<div class="flex flex-col items-start gap-2">
						<Badge variant={calificacion.despachoSeccional?.nombre ? 'default' : 'secondary'}>
							{calificacion.despachoSeccional?.nombre.slice(0, 10) || 'Sin despacho asignado'}
						</Badge>
					</div>
					<div>
						{calificacion.funcionario.nombre}
						{#each calificacion.calificaciones as califDespacho}
							<div class="text-sm text-slate-500">
								{califDespacho.despacho.nombre}
							</div>
						{/each}
					</div>
				</a>
			{:else}
				<div class="text-slate-600">
					No hay calificaciones que coincidan con los criterios de búsqueda.
				</div>
			{/each}
			{#each calificaciones as calificacion}
				<a
					href="/calificacion/{calificacion.id}"
					class="grid grid-cols-[160px_1fr] items-center justify-start gap-2 p-2 hover:bg-slate-100"
				>
					<div class="flex flex-col items-start gap-2">
						<Badge variant={calificacion.despachoSeccional?.nombre ? 'default' : 'secondary'}>
							{calificacion.despachoSeccional?.nombre.slice(0, 10) || 'Sin despacho asignado'}
						</Badge>
					</div>
					<div>
						{calificacion.funcionario.nombre}
						{#each calificacion.calificaciones as califDespacho}
							<div class="text-sm text-slate-500">
								{califDespacho.despacho.nombre}
							</div>
						{/each}
					</div>
				</a>
			{:else}
				<div class="text-slate-600">
					No hay calificaciones que coincidan con los criterios de búsqueda.
				</div>
			{/each}
		</Tabs.Content>
	</Tabs.Root>
</PageLayout>
