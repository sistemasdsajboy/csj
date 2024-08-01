<script lang="ts">
	import type { EstadoCalificacion } from '@prisma/client';
	import _ from 'lodash';

	const { estado }: { estado: EstadoCalificacion } = $props();
</script>

<div class="space-x-2">
	{#if estado === 'borrador'}
		<span class="font-bold text-slate-700">Borrador</span>
	{:else if estado === 'revision'}
		<span class="font-bold text-amber-700">En revisión</span>
	{:else if estado === 'aprobada'}
		<span class="font-bold text-teal-700">Aprobada</span>
	{:else if estado === 'devuelta'}
		<span class="font-bold text-rose-700">Devuelta</span>
	{:else if estado === 'eliminada'}
		<span class="font-bold text-slate-700">Eliminada</span>
	{:else}
		<span class="font-bold">{_.capitalize(estado)}</span>
	{/if}
</div>
