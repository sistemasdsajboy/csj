<script lang="ts">
	import { goto } from '$app/navigation';
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
	let funcionarioId = $state<string | null>(null);

	const labels = {
		borrador: 'Borrador',
		revision: 'Para revisar',
		aprobada: 'Aprobada',
		devuelta: 'Devuelta',
		archivada: 'Archivada',
		eliminada: 'Eliminada',
	};

	function actualizarFiltro(filter: string, value: string) {
		fetch('?/actualizarFiltro', {
			method: 'POST',
			headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
			body: new URLSearchParams({ filter, value }),
		}).then(() => {
			goto('/calificaciones', { replaceState: true, invalidateAll: true });
		});
	}
</script>

{#snippet header()}
	<h1 class="grow text-lg font-bold uppercase">Calificaciones</h1>
{/snippet}

{#snippet sidebar()}
	<div class="flex max-w-md flex-col gap-2 pt-10">
		<Badge variant="secondary" class="m-auto text-center">
			{#await data.calificaciones}
				Cargando...
			{:then calificaciones}
				{calificaciones.length}
				{calificaciones.length === 1 ? 'calificación' : 'calificaciones'}
			{/await}
		</Badge>

		{#if data.opcionesFiltros.despachosCalificadores.length > 1}
			<Card.Root>
				<Card.Header>
					<Card.Title>Filtrar calificaciones</Card.Title>
				</Card.Header>
				<Card.Content>
					<Label for="periodo">Periodo</Label>
					<Select.Root
						onSelectedChange={(selected) => actualizarFiltro('periodo', selected?.value || '')}
						selected={data.opcionesFiltros.periodos.find((d) => data.periodo === d.value)}
					>
						<Select.Trigger class="w-full">
							<Select.Value />
						</Select.Trigger>
						<Select.Content>
							<Select.Group>
								{#each data.opcionesFiltros.periodos as d}
									<Select.Item value={d.value}>{d.label}</Select.Item>
								{/each}
							</Select.Group>
						</Select.Content>
						<Select.Input name="periodo" />
					</Select.Root>

					<Label for="despachoId">Despacho Calificador</Label>
					<Select.Root
						onSelectedChange={(selected) => actualizarFiltro('despachoSeccionalId', selected?.value || '')}
						selected={data.opcionesFiltros.despachosCalificadores.find((d) => data.filtros.despachoSeccionalId === d.value)}
					>
						<Select.Trigger class="w-full">
							<Select.Value />
						</Select.Trigger>
						<Select.Content>
							<Select.Group>
								{#each data.opcionesFiltros.despachosCalificadores as d}
									<Select.Item value={d.value}>{d.label}</Select.Item>
								{/each}
							</Select.Group>
						</Select.Content>
						<Select.Input name="despachoId" />
					</Select.Root>

					<Label for="tipoDespachoId">Tipo de despacho</Label>
					<Select.Root
						onSelectedChange={(selected) => actualizarFiltro('tipoDespachoId', selected?.value || '')}
						selected={data.opcionesFiltros.tiposDespacho.find((d) => data.filtros.tipoDespachoId === d.value)}
					>
						<Select.Trigger class="w-full">
							<Select.Value />
						</Select.Trigger>
						<Select.Content>
							<Select.Group>
								{#each data.opcionesFiltros.tiposDespacho as td}
									<Select.Item value={td.value}>{td.label}</Select.Item>
								{/each}
							</Select.Group>
						</Select.Content>
						<Select.Input name="tipoDespachoId" />
					</Select.Root>

					<Label for="distrito">Distrito</Label>
					<Select.Root
						onSelectedChange={(selected) => actualizarFiltro('distrito', selected?.value || '')}
						selected={data.opcionesFiltros.distritos.find((d) => data.filtros.distrito === d.value)}
					>
						<Select.Trigger class="w-full">
							<Select.Value />
						</Select.Trigger>
						<Select.Content>
							<Select.Group>
								{#each data.opcionesFiltros.distritos as d}
									<Select.Item value={d.value}>{d.label}</Select.Item>
								{/each}
							</Select.Group>
						</Select.Content>
						<Select.Input name="distrito" />
					</Select.Root>

					<Label for="municipio">Municipio</Label>
					<Select.Root
						onSelectedChange={(selected) => actualizarFiltro('municipio', selected?.value || '')}
						selected={data.opcionesFiltros.municipios.find((d) => data.filtros.municipio === d.value)}
					>
						<Select.Trigger class="w-full">
							<Select.Value />
						</Select.Trigger>
						<Select.Content>
							<Select.Group>
								{#each data.opcionesFiltros.municipios as m}
									<Select.Item value={m.value}>{m.label}</Select.Item>
								{/each}
							</Select.Group>
						</Select.Content>
						<Select.Input name="municipio" />
					</Select.Root>
				</Card.Content>
			</Card.Root>
		{/if}

		<CargaXlsxEstadisticasForm {form} />

		<SeleccionFuncionario bind:funcionarioId funcionarios={data.funcionarios}></SeleccionFuncionario>
	</div>
{/snippet}

<PageLayout {header} {sidebar} username={data.user}>
	<Tabs.Root value={data.estado} class="w-full" onValueChange={(e) => actualizarFiltro('estado', e as string)}>
		<Tabs.List class="flex w-full justify-between">
			{#each data.estados as e}
				<Tabs.Trigger value={e} class="flex w-full gap-2 ">
					{labels[e]}
				</Tabs.Trigger>
			{/each}
		</Tabs.List>
		<Tabs.Content value={data.estado}>
			{#await data.calificaciones}
				<div class="text-slate-600">Cargando...</div>
			{:then calificaciones}
				{#each calificaciones as calificacion}
					<a
						href="/calificacion/{calificacion.id}?despacho={calificacion.calificaciones[0].despachoId}"
						class="grid grid-cols-[160px_1fr] items-center justify-start gap-2 p-2 hover:bg-slate-100"
					>
						<div class="flex flex-col items-start gap-2">
							<Badge variant={calificacion.despachoSeccional?.nombre ? 'default' : 'secondary'}>
								{calificacion.despachoSeccional?.nombre.slice(0, 10) || 'Sin despacho asignado'}
							</Badge>
						</div>
						<div>
							<div class="flex items-center gap-4">
								{calificacion.funcionario.nombre}
								{#if calificacion.estado === 'revision' && calificacion.observaciones?.length > 0}
									<Badge class="bg-amber-700">
										{`${calificacion.observaciones.length} ${calificacion.observaciones.length === 1 ? 'devolución' : 'devoluciones'}`}
									</Badge>
								{/if}
							</div>
							{#each calificacion.calificaciones as califDespacho}
								<div class="text-sm text-slate-500">
									{califDespacho.despacho.nombre}
								</div>
							{/each}
						</div>
					</a>
				{:else}
					<div class="text-slate-600">No hay calificaciones que coincidan con los criterios de búsqueda.</div>
				{/each}
			{:catch _}
				<div class="text-slate-600">Ha ocurrido un error durante la carga del listado de calificaciones.</div>
			{/await}
		</Tabs.Content>
	</Tabs.Root>
</PageLayout>
