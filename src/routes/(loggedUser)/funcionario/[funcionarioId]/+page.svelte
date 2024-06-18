<script lang="ts">
	import PageLayout from '$lib/components/custom/page-layout.svelte';
	import { Button } from '$lib/components/ui/button';
	import { Label } from '$lib/components/ui/label';
	import * as Select from '$lib/components/ui/select';
	import { Edit2Icon } from 'lucide-svelte';

	let { data } = $props();
	let despachoId: string | null = $state(null);
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
				<div class="grid items-center gap-2 pb-2 sm:grid-cols-[1fr_2fr_1fr]">
					<Label for="periodo">Periodo</Label>
					<div class="col-span-2">
						<Select.Root portal={null}>
							<Select.Trigger class="w-64">
								<Select.Value />
							</Select.Trigger>
							<Select.Content>
								<Select.Group>
									<Select.Item value={2023}>2023</Select.Item>
								</Select.Group>
							</Select.Content>
							<Select.Input name="periodo" />
						</Select.Root>
					</div>

					<Label for="despachoId">Despacho</Label>
					<Select.Root
						portal={null}
						onSelectedChange={(selected) => (despachoId = selected?.value?.toString() || null)}
					>
						<Select.Trigger class="w-64">
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

					{#if despachoId}
						<a href="/despacho/{despachoId}" class="print:hidden">
							<Edit2Icon class=" mt-1 h-4 w-4" />
						</a>
					{/if}

					<div class="col-span-2 text-right">
						<Button type="submit">Ver calificación</Button>
					</div>
				</div>
			</form>
		</div>
	</div>
</PageLayout>
