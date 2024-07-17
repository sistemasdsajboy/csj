<script lang="ts">
	import { Badge } from '$lib/components/ui/badge';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { formatDate } from '$lib/utils/dates';
	import type { NovedadFuncionario } from '@prisma/client';
	import Trash2Icon from 'lucide-svelte/icons/trash-2';

	let { novedades }: { novedades: NovedadFuncionario[] } = $props();
</script>

{#if novedades.length > 0}
	<div class="overflow-x-auto">
		<table class="table-auto border-collapse">
			<thead>
				<tr class="bg-gray-100 dark:bg-gray-800">
					<th class="px-2 py-2 text-center font-medium text-gray-700 dark:text-gray-300"> Tipo </th>
					<th class="px-2 py-2 text-center font-medium text-gray-700 dark:text-gray-300">
						Periodo
					</th>
					<th class="px-2 py-2 text-center font-medium text-gray-700 dark:text-gray-300">
						Días hábiles
					</th>
					<th class="px-2 py-2 text-center font-medium text-gray-700 dark:text-gray-300">
						Observaciones
					</th>
					<th></th>
				</tr>
			</thead>
			<tbody>
				{#each novedades as novedad}
					<tr class="border-b border-gray-200 dark:border-gray-700">
						<td class="text-nowrap px-2 text-gray-900 dark:text-gray-100">
							{novedad.type}
						</td>
						<td class="px-2 text-center text-gray-900 dark:text-gray-100">
							<Badge variant="secondary">{formatDate(novedad.from)}-{formatDate(novedad.to)}</Badge>
						</td>
						<td class="px-2 text-center text-gray-900 dark:text-gray-100">{novedad.days}</td>
						<td class="px-2 text-gray-900 dark:text-gray-100">
							{novedad.notes}
						</td>
						<td class="px-2 text-gray-900 dark:text-gray-100">
							<form action="?/deleteNovedad" method="post">
								<Input type="hidden" name="novedadId" value={novedad.id} />
								<Button type="submit" variant="destructive">
									<Trash2Icon class="h-4 w-4" />
								</Button>
							</form>
						</td>
					</tr>
				{/each}
			</tbody>
		</table>
	</div>
{:else}
	<div class="text-slate-600">Sin novedades registradas en el periodo</div>
{/if}
