<script lang="ts">
	import SearchSelect from '$lib/components/custom/search-select.svelte';
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import { Label } from '$lib/components/ui/label';

	export let funcionarios: { label: string; value: string }[] = [];
	export let funcionarioId: string | null = null;
</script>

<Card.Root>
	<Card.Header>
		<Card.Title>Información de funcionarios</Card.Title>
	</Card.Header>
	<Card.Content>
		<Label>Funcionario</Label>
		<SearchSelect
			options={funcionarios}
			placeholder="Buscar funcionario..."
			bind:value={funcionarioId}
		></SearchSelect>
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
