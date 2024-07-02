<script lang="ts">
	import PageLayout from '$lib/components/custom/page-layout.svelte';
	import { Badge } from '$lib/components/ui/badge';
	import { cn } from '$lib/utils/shadcn';

	const { data } = $props();
	const { calificaciones } = data;

	const colors = {
		borrador: 'bg-slate-700',
		revision: 'bg-amber-700',
		aprobada: 'bg-teal-700',
		devuelta: 'bg-rose-700'
	};
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

<!-- TODO: Filtros por despacho y estado -->
<!--{#snippet sidebar()}
	<div class="max-w-md">
	</div>
{/snippet} -->

<PageLayout {header} username={data.user}>
	<div>
		{#each calificaciones as calificacion}
			<a
				href="/calificacion/{calificacion.id}"
				class="grid grid-cols-[160px_1fr] items-center justify-start gap-2 hover:bg-slate-100 p-2"
			>
				<div class="flex flex-col items-start gap-2">
					<Badge variant={calificacion.despachoSeccional?.nombre ? 'default' : 'secondary'}>
						{calificacion.despachoSeccional?.nombre.slice(0, 10) || 'Sin despacho asignado'}
					</Badge>
					<Badge class={colors[calificacion.estado]}>
						{labels[calificacion.estado]}
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
		{/each}
	</div>
</PageLayout>
