<script lang="ts">
	import PageLayout from '$lib/components/custom/page-layout.svelte';
	import type { PageData } from './$types';

	export let data: PageData;
</script>

<PageLayout username={data.user}>
    Calificaciones
</PageLayout>
