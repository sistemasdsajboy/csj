<script lang="ts">
	import PageLayout from '$lib/components/custom/page-layout.svelte';
	import { Button } from '$lib/components/ui/button';
	import * as Select from '$lib/components/ui/select';

	let { data } = $props();
</script>

{#snippet header()}
	<div class="text-2xl font-bold">
		{data.funcionario.nombre}
	</div>
{/snippet}

<PageLayout {header} username={data.user}>
	<div class="container mx-auto px-4">
		<div class="flex flex-row justify-between print:hidden">
			<form class="w-96 space-y-2" method="post" action="?/generarCalificacion">
				<Select.Root portal={null}>
					<Select.Trigger class="w-full">
						<Select.Value />
					</Select.Trigger>
					<Select.Content>
						<Select.Group>
							<Select.Item value={2023}>2023</Select.Item>
						</Select.Group>
					</Select.Content>
					<Select.Input name="periodo" />
				</Select.Root>

				<Select.Root portal={null}>
					<Select.Trigger class="w-full">
						<Select.Value />
					</Select.Trigger>
					<Select.Content>
						<Select.Group>
							{#each data.despachos as d}
								<Select.Item value={d.id}>{d.nombre}</Select.Item>
							{/each}
						</Select.Group>
					</Select.Content>
					<Select.Input name="despachoId" />
				</Select.Root>

				<Button type="submit">Ver calificacion</Button>
			</form>
		</div>
	</div>
</PageLayout>
