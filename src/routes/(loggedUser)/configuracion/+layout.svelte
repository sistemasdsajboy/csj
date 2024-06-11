<script>
	import { page } from '$app/stores';
	import PageLayout from '$lib/components/custom/page-layout.svelte';
	import { cn } from '$lib/utils/shadcn';

	const { data, children } = $props();
	const { url } = $page;
</script>

<PageLayout username={data.user}>
	<div class="flex gap-2 pb-4">
		<a
			href="/configuracion/usuarios"
			class={cn({ 'text-sky-800 underline': !url.pathname.startsWith('/configuracion/usuarios') })}
		>
			Usuarios
		</a>
	</div>

	{@render children()}
</PageLayout>
