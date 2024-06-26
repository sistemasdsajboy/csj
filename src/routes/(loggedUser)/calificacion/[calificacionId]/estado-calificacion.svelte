<script lang="ts">
	import { Badge } from '$lib/components/ui/badge';
	import { Button } from '$lib/components/ui/button';
	import * as Popover from '$lib/components/ui/popover';
	import { formatDate } from '$lib/utils/dates';
	import type { EstadoCalificacion } from '@prisma/client';
	import _ from 'lodash';

	type Observacion = {
		fecha: Date;
		observaciones: string;
		autor: { username: string } | null;
	};

	const {
		estado,
		observaciones
	}: { estado: EstadoCalificacion; observaciones: Array<Observacion> } = $props();
</script>

<div class="space-x-2">
	{#if estado === 'borrador'}
		<span class="font-bold text-slate-700">Borrador</span>
	{:else if estado === 'revision'}
		<span class="font-bold text-amber-700">Para aprobación</span>
	{:else if estado === 'aprobada'}
		<span class="font-bold text-teal-700">Calificación aprobada</span>
	{:else if estado === 'devuelta'}
		<Popover.Root portal={null}>
			<Popover.Trigger asChild let:builder>
				<Button builders={[builder]} variant="ghost" class="font-bold text-rose-700">
					Devuelta
				</Button>
			</Popover.Trigger>
			<Popover.Content class="w-full max-w-2xl space-y-4">
				{#each observaciones as observacion}
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
			</Popover.Content>
		</Popover.Root>
	{:else}
		<span class="font-bold">{_.capitalize(estado)}</span>
	{/if}
</div>
