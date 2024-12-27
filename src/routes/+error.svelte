<script lang="ts">
	import { page } from '$app/state';
</script>

<h1>{page.status}</h1>
<h1>{page.error?.message}</h1>
