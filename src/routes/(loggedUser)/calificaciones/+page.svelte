<script lang="ts">
	import PageLayout from '$lib/components/custom/page-layout.svelte';
	import { Badge } from '$lib/components/ui/badge';
	import { cn } from '$lib/utils/shadcn';
	import { Edit2Icon } from 'lucide-svelte';
	import AsignarDespachoForm from './asignar-despacho-form.svelte';

	const { data } = $props();
	const { calificaciones, despachos } = data;

	const colors = {
		borrador: 'bg-slate-700',
		revision: 'bg-amber-700',
		aprobada: 'bg-teal-700'
	};
	const labels = {
		borrador: 'Borrador',
		revision: 'Para revisar',
		aprobada: 'Aprobada'
	};
</script>

{#snippet header()}
	<h1 class="grow text-lg font-bold uppercase">Calificaciones</h1>
{/snippet}

<!-- TODO: Filtros por despacho y estado -->
<!--{#snippet sidebar()}
	<div class="max-w-md">
	</div>
{/snippet} -->

<PageLayout {header} username={data.user}>
	<div>
		{#each calificaciones as calificacion}
			<div class="flex flex-row items-center justify-between gap-2">
				<div
					class={cn(
						'inline-flex w-20 justify-center rounded-sm text-xs text-slate-100',
						colors[calificacion.estado]
					)}
				>
					{labels[calificacion.estado]}
				</div>
				<a href="/calificacion/{calificacion.id}"
					>{calificacion.funcionario.nombre} - {calificacion.despacho.nombre}</a
				>

				<div class="grow"></div>

				<Badge variant={calificacion.despachoSeccional?.nombre ? 'default' : 'secondary'}>
					{calificacion.despachoSeccional?.nombre.slice(0, 10) || 'Sin despacho asignado'}
				</Badge>
				<AsignarDespachoForm calificacionId={calificacion.id} {despachos}>
					<Edit2Icon class="h-4 w-4" />
				</AsignarDespachoForm>
			</div>
		{/each}
	</div>
</PageLayout>
