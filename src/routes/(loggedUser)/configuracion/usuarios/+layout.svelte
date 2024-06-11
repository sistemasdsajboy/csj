<script>
	import { cn } from '$lib/utils/shadcn';

	const { children, data } = $props();
</script>

<div class="flex flex-row gap-4">
	<div class="w-48 border-r border-slate-500">
		{#each data.users as user}
			<a
				href={`/configuracion/usuarios/${user.id}`}
				class={cn('block w-full p-2', { 'bg-sky-300': user.isSelected })}
			>
				{user.username}
			</a>
		{/each}
	</div>

	{@render children()}
</div>
