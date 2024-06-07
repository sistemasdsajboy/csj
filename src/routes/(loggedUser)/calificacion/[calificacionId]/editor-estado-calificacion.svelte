<script lang="ts">
	import * as AlertDialog from '$lib/components/ui/alert-dialog';
	import { Button } from '$lib/components/ui/button';
	import type { EstadoCalificacion } from '@prisma/client';

	const { estado }: { estado: EstadoCalificacion } = $props();
</script>

{#if estado !== 'aprobada'}
	<AlertDialog.Root>
		<AlertDialog.Trigger asChild let:builder>
			<Button builders={[builder]}>
				{#if estado === 'borrador'}
					Enviar a revisión
				{:else if estado === 'revision'}
					Aprobar
				{/if}
			</Button>
		</AlertDialog.Trigger>
		<AlertDialog.Content>
			<AlertDialog.Header>
				<AlertDialog.Title>Cambiar estado de la calificación.</AlertDialog.Title>
				<AlertDialog.Description>
					Esta a punto de cambiar el estado actual de la calificación. Desea continuar?
				</AlertDialog.Description>
			</AlertDialog.Header>
			<AlertDialog.Footer>
				<AlertDialog.Cancel>Cancelar</AlertDialog.Cancel>
				<form action="?/actualizarEstado" method="post">
					<Button type="submit">Confirmar</Button>
				</form>
			</AlertDialog.Footer>
		</AlertDialog.Content>
	</AlertDialog.Root>
{/if}
