<script lang="ts">
	import { formatDate } from '$lib/utils/dates';
	import type { NovedadFuncionario } from '@prisma/client';

	let { novedades }: { novedades: NovedadFuncionario[] } = $props();
</script>

<div>
	{#each novedades as novedad}
		<div>
			<div>
				Fecha: {formatDate(novedad.from)} - {formatDate(novedad.to)} ({novedad.days} días) {novedad.type}
				({novedad.notes})
			</div>
		</div>
	{:else}
		<div class="text-slate-600">Sin novedades registradas</div>
	{/each}
</div>
