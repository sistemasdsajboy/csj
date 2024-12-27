<script lang="ts">
	import Badge from '$lib/components/ui/badge/badge.svelte';
	import type { EstadoCalificacion } from '@prisma/client';
	import _ from 'lodash';

	const { estado }: { estado: EstadoCalificacion } = $props();
</script>

<Badge variant="secondary" class="text-sm">
	<div class="space-x-2 font-bold">
		Estado de la calificación:
		{#if estado === 'borrador'}
			<span class="text-slate-700">Borrador</span>
		{:else if estado === 'revision'}
			<span class="text-amber-700">En revisión</span>
		{:else if estado === 'aprobada'}
			<span class="text-teal-700">Aprobada</span>
		{:else if estado === 'devuelta'}
			<span class="text-rose-700">Devuelta</span>
		{:else if estado === 'eliminada'}
			<span class="text-slate-700">Eliminada</span>
		{:else}
			<span>{_.capitalize(estado)}</span>
		{/if}
	</div>
</Badge>
