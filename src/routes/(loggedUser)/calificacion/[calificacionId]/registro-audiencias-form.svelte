<script lang="ts">
	import { Button, buttonVariants } from '$lib/components/ui/button';
	import * as Dialog from '$lib/components/ui/dialog';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import type { RegistroAudiencias } from '@prisma/client';

	const { registroAudiencias }: { registroAudiencias: RegistroAudiencias } = $props();
</script>

<Dialog.Root>
	<Dialog.Trigger class={buttonVariants({ variant: 'outline' })}>Registrar información de audiencias</Dialog.Trigger>
	<Dialog.Content class="sm:max-w-[425px]">
		<Dialog.Header>
			<Dialog.Title>Información de audiencias</Dialog.Title>
			<Dialog.Description>Información de totales de audiencias para el periodo.</Dialog.Description>
		</Dialog.Header>

		<form method="post" action="?/addRegistroAudiencias">
			<div class="grid grid-cols-3 gap-4 py-4">
				<input type="hidden" name="despachoId" value={registroAudiencias.despachoId} />
				<div class="flex w-full max-w-sm flex-col gap-1.5">
					<Label for="programadas">Programadas</Label>
					<Input type="number" name="programadas" value={registroAudiencias.programadas} required class="text-center" />
				</div>
				<div class="flex w-full max-w-sm flex-col gap-1.5">
					<Label for="atendidas">Atendidas</Label>
					<Input type="number" name="atendidas" value={registroAudiencias.atendidas} required class="text-center" />
				</div>
			</div>

			<Label for="aplazadasAjenas" class="text-bold text-lg">Aplazadas</Label>
			<div class="grid grid-cols-3 gap-4 py-4">
				<div class="flex w-full max-w-sm flex-col gap-1.5">
					<Label for="aplazadasAjenas">Causas ajenas</Label>
					<Input type="number" name="aplazadasAjenas" value={registroAudiencias.aplazadasAjenas} required class="text-center" />
				</div>
				<div class="flex w-full max-w-sm flex-col gap-1.5">
					<Label for="aplazadasJustificadas">Justificadas</Label>
					<Input type="number" name="aplazadasJustificadas" value={registroAudiencias.aplazadasJustificadas} required class="text-center" />
				</div>
				<div class="flex w-full max-w-sm flex-col gap-1.5">
					<Label for="aplazadasNoJustificadas">No justificadas</Label>
					<Input
						type="number"
						name="aplazadasNoJustificadas"
						value={registroAudiencias.aplazadasNoJustificadas}
						required
						class="text-center"
					/>
				</div>
			</div>

			<Dialog.Footer>
				<Button type="submit">Guardar</Button>
			</Dialog.Footer>
		</form>
	</Dialog.Content>
</Dialog.Root>
