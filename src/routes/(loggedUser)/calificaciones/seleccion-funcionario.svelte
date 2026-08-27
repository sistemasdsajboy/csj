<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import * as Command from '$lib/components/ui/command';
	import { Label } from '$lib/components/ui/label';
	import * as Popover from '$lib/components/ui/popover';
	import { tick } from 'svelte';

	/**
	 * Buscador de funcionarios.
	 *
	 * Antes era un `<input list>` con un `<datalist>`. La lista de sugerencias de
	 * un datalist la dibuja y la ubica el navegador por su cuenta: no se puede
	 * darle estilo ni corregir dónde aparece, y en la práctica salía flotando
	 * fuera de la tarjeta. Aquí la lista es parte de la página.
	 */

	let {
		funcionarios = [],
		funcionarioId = $bindable(null),
	}: { funcionarios: { label: string; value: string }[]; funcionarioId: string | null } = $props();

	let abierto = $state(false);
	const seleccionado = $derived(funcionarios.find((f) => f.value === funcionarioId));

	// Al cerrar hay que devolver el foco al botón: si no, el teclado queda en el
	// aire y quien navega sin ratón pierde el hilo.
	const elegir = (id: string, boton: HTMLElement | null) => {
		funcionarioId = id;
		abierto = false;
		tick().then(() => boton?.focus());
	};
</script>

<Card.Root>
	<Card.Header>
		<Card.Title>Información de funcionarios</Card.Title>
	</Card.Header>
	<Card.Content>
		<Label for="funcionario">Funcionario</Label>
		<Popover.Root bind:open={abierto}>
			<Popover.Trigger asChild let:builder>
				<Button
					builders={[builder]}
					id="funcionario"
					variant="outline"
					role="combobox"
					aria-expanded={abierto}
					class="w-full justify-between text-left font-normal"
				>
					<span class="truncate">
						{seleccionado?.label ?? 'Buscar funcionario por nombre...'}
					</span>
					<span aria-hidden="true" class="pl-2 opacity-60">▾</span>
				</Button>
			</Popover.Trigger>

			<Popover.Content class="w-[min(30rem,90vw)] p-0" align="start">
				<Command.Root>
					<Command.Input placeholder="Escribe parte del nombre..." />
					<Command.Empty>Ningún funcionario con ese nombre.</Command.Empty>
					<Command.List>
						<Command.Group>
							{#each funcionarios as funcionario}
								<Command.Item value={funcionario.label} onSelect={() => elegir(funcionario.value, document.getElementById('funcionario'))}>
									{funcionario.label}
								</Command.Item>
							{/each}
						</Command.Group>
					</Command.List>
				</Command.Root>
			</Popover.Content>
		</Popover.Root>
	</Card.Content>
	<Card.Footer class="flex justify-between">
		{#if funcionarioId}
			<a href="/funcionario/{funcionarioId}">
				<Button type="submit" variant="secondary">Ver información de funcionario</Button>
			</a>
		{:else}
			<Button type="submit" variant="secondary" disabled>Ver información de funcionario</Button>
		{/if}
	</Card.Footer>
</Card.Root>
