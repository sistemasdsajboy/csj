<script lang="ts">
	import PageLayout from '$lib/components/custom/page-layout.svelte';
	import { Button } from '$lib/components/ui/button';
	import { Label } from '$lib/components/ui/label';
	import * as Select from '$lib/components/ui/select';
	import { Edit2Icon } from 'lucide-svelte';

	let { data, form } = $props();
	let periodo: number | null = $state(null);
	let despachoId: string | null = $state(null);
	let despachos = $state<typeof data.despachosPeriodos>([]);

	$effect(() => {
		despachos = data.despachosPeriodos.filter((d) => d.periodo === periodo);
		despachoId = null;
	});
</script>

{#snippet header()}
	<div class="text-2xl font-bold">
		{data.funcionario.nombre}
	</div>
{/snippet}

<PageLayout {header} username={data.user}>
	<div class="container mx-auto px-4 space-y-2">
		<h3 class="text-md font-bold text-sky-800">Generar calificación</h3>

		{#if data.periodos.length > 0}
			<div class="flex flex-row justify-between print:hidden">
				<form class="w-96 space-y-2" method="post" action="?/generarCalificacion">
					<div class="grid grid-cols-[30%_70%] items-center gap-2 pb-2">
						<Label for="periodo">Periodo</Label>
						<Select.Root
							portal={null}
							onSelectedChange={(selected) =>
								(periodo = parseInt(selected?.value?.toString() || '') || null)}
						>
							<Select.Trigger class="w-full">
								<Select.Value />
							</Select.Trigger>
							<Select.Content>
								<Select.Group>
									{#each data.periodos as p}
										<Select.Item value={p}>{p}</Select.Item>
									{/each}
								</Select.Group>
							</Select.Content>
							<Select.Input name="periodo" />
						</Select.Root>

						{#if periodo}
							<Label for="despachoId">Despacho</Label>
							<div class="flex flex-row items-center gap-2">
								<Select.Root
									portal={null}
									onSelectedChange={(selected) =>
										(despachoId = selected?.value?.toString() ?? null)}
								>
									<Select.Trigger class="w-full">
										<Select.Value />
									</Select.Trigger>
									<Select.Content>
										<Select.Group>
											{#each despachos as dp}
												<Select.Item value={dp.despacho.id}>{dp.despacho.nombre}</Select.Item>
											{/each}
										</Select.Group>
									</Select.Content>
									<Select.Input name="despachoId" bind:value={despachoId} />
								</Select.Root>

								{#if despachoId}
									<a href="/despacho/{despachoId}" class="print:hidden">
										<Edit2Icon class=" mt-1 h-4 w-4" />
									</a>
								{/if}
							</div>
						{/if}

						<div class="col-span-2 text-right">
							<Button type="submit">Ver calificación</Button>
						</div>
					</div>
					{#if form?.error}
						<div class="text-rose-700">{form.error}</div>
					{/if}
				</form>
			</div>
		{:else}
			<p class="text-muted-foreground">
				No hay información estadística disponible para generar una calificación de este funcionario.
			</p>
		{/if}
	</div>
</PageLayout>
