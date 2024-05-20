<script>
	import { countLaborDaysBetweenDates } from '$lib/utils/dates';

    let { registroId } = $props();

	let from = $state('');
	let to = $state('');
	let days = $state(0);

	$effect(() => {
		if (from && to) {
			days = countLaborDaysBetweenDates(new Date(from), new Date(to));
		}
	});
</script>

<h3>Agregar novedad</h3>
<form method="post" action="?/addNovedad">
    <input type="hidden" name="registroId" value={registroId}>
	<div>
		<select required name="type">
			<option value="incapacidad">Incapacidad</option>
			<option value="licencia">Licencia</option>
			<option value="vacaciones">Vacaciones</option>
		</select>
	</div>
	<div><input type="date" name="from" required bind:value={from} /></div>
	<div><input type="date" name="to" required bind:value={to} /></div>
	<div><input type="number" name="days" disabled bind:value={days} /></div>
	<div><input type="text" name="notes" /></div>

	<button type="submit">Cargar</button>
</form>
