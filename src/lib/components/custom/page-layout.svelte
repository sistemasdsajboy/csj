<script lang="ts">
	import { Separator } from '$lib/components/ui/separator';
</script>

<div
	class="container flex flex-col items-start justify-between space-y-2 py-4 sm:flex-row sm:items-center sm:space-y-0 md:h-16"
>
	{#if $$slots.header}
		<h1 class="text-lg font-bold uppercase">
			<slot name="header" />
		</h1>
	{/if}
	<div class="ml-auto flex w-full space-x-2 sm:justify-end">
		<!-- SEARCH TOOL AND USER OPTIONS -->
	</div>
</div>

<Separator />

<div class="container h-full py-6">
	<div class={`grid h-full items-stretch gap-6  md:grid-cols-[1fr_320px]`}>
		{#if $$slots.sidebar}
			<div class="hidden flex-col space-y-4 sm:flex md:order-2">
				<slot name="sidebar" />
			</div>
		{/if}

		<div class="md:order-1">
			<slot />
		</div>
	</div>
</div>
