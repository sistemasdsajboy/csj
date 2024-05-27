<script lang="ts">
	import { Separator } from '$lib/components/ui/separator';
	import { cn } from '$lib/utils/shadcn';
</script>

<div
	class="container flex flex-col items-start justify-between space-y-2 py-4 sm:flex-row sm:items-center sm:space-y-0 md:h-16"
>
	{#if $$slots.header}
		<h1 class="grow text-lg font-bold uppercase">
			<slot name="header" />
		</h1>
	{/if}
	<div class="flex space-x-2 sm:justify-end grow">
		<slot name="userInfo" />
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

		<div class={cn('md:order-1', { 'md:col-span-2': !$$slots.sidebar })}>
			<slot />
		</div>
	</div>
</div>
