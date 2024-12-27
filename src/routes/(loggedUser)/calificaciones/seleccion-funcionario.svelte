<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import Input from '$lib/components/ui/input/input.svelte';
	import { Label } from '$lib/components/ui/label';

	let {
		funcionarios = [],
		funcionarioId = $bindable(null),
	}: { funcionarios: { label: string; value: string }[]; funcionarioId: string | null } = $props();

	let nombreFuncionario = $state('');

	$effect(() => {
		if (nombreFuncionario) {
			const funcionario = funcionarios.find((f) => f.label === nombreFuncionario);
			if (funcionario) funcionarioId = funcionario.value;
		}
	});
</script>

<Card.Root>
	<Card.Header>
		<Card.Title>Información de funcionarios</Card.Title>
	</Card.Header>
	<Card.Content>
		<Label>Funcionario</Label>
		<div class="flex w-full flex-row">
			<Input list="funcionarios" bind:value={nombreFuncionario} placeholder="Buscar funcionario por nombre..." />
			<datalist id="funcionarios">
				{#each funcionarios as funcionario}
					<option value={funcionario.label}></option>
				{/each}
			</datalist>
		</div>
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
