<script>
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
</script>

<h3 class="text-xl font-bold">Cargar archivo consolidado para calificar</h3>
<form method="post" action="?/loadFile" enctype="multipart/form-data">
	<Input type="file" name="file" accept=".xlsx, .xls" />
	<Button type="submit">Cargar</Button>
</form>
