<script lang="ts">
	import type { NovedadRegistroCalificacion } from '$lib/db/schema';
	import { formatDate } from '$lib/utils/dates';

	let { novedades }: { novedades: NovedadRegistroCalificacion[] } = $props();
</script>

<div>
	{#each novedades as novedad}
		<div>
			<div>{novedad.type} ({novedad.notes})</div>
			<div>Fecha: {formatDate(novedad.from)} - {formatDate(novedad.to)} ({novedad.days} días)</div>
		</div>
	{/each}
</div>
