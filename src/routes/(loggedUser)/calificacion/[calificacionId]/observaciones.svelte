<script lang="ts">
	import * as AlertDialog from '$lib/components/ui/alert-dialog';
	import { Badge } from '$lib/components/ui/badge';
	import { Button } from '$lib/components/ui/button';
	import { ScrollArea } from '$lib/components/ui/scroll-area';
	import { formatDate } from '$lib/utils/dates';
	import _ from 'lodash';

	type Observacion = {
		fecha: Date;
		observaciones: string;
		autor: { username: string } | null;
	};

	const { observaciones }: { observaciones: Array<Observacion> } = $props();
</script>

{#if observaciones?.length > 0}
	<AlertDialog.Root>
		<AlertDialog.Trigger asChild let:builder>
			<Button builders={[builder]} variant="outline">Observaciones</Button>
		</AlertDialog.Trigger>
		<AlertDialog.Content>
			<AlertDialog.Header>
				<AlertDialog.Title>Observaciones</AlertDialog.Title>
			</AlertDialog.Header>
			<ScrollArea class="h-[340px] rounded-md border p-4">
				{#each _.sortBy(observaciones, 'fecha').reverse() as observacion}
					<div class="flex items-center gap-2">
						<div>
							<Badge variant="secondary">
								{formatDate(observacion.fecha)}
							</Badge>
						</div>
						<div class="grow">
							<span class="text-sm text-slate-500">{observacion.autor?.username}</span>
							<div class="leading-tight">{observacion.observaciones}</div>
						</div>
					</div>
				{/each}
			</ScrollArea>
			<AlertDialog.Footer>
				<AlertDialog.Cancel>Cerrar</AlertDialog.Cancel>
			</AlertDialog.Footer>
		</AlertDialog.Content>
	</AlertDialog.Root>
{/if}
