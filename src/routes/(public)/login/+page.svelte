<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import type { ActionData } from './$types';

	export let form: ActionData;

	// El paso del código se mantiene mientras haya un usuario en la respuesta,
	// tanto si el envío salió bien como si el código estaba mal. Antes dependía
	// de `success`, que los fallos no traen, así que un código equivocado
	// devolvía a la persona a la pantalla inicial sin decirle nada.
	$: vencio = !!form && 'vencido' in form && form.vencido === true;
	$: enPasoDelCodigo = !!form?.username && !vencio;
</script>

<div class="flex flex-row justify-center p-8">
	<Card.Root class="w-[350px] text-center">
		<Card.Header>
			<Card.Title>Iniciar sesión</Card.Title>
			<Card.Description>
				{#if enPasoDelCodigo}
					Se ha enviado un correo electronico a {form?.username}@cendoj.ramajudicial.gov.co con el código de inicio de sesión.
				{:else}
					Escriba su nombre de usuario de correo personal institucional para recibir el código de inicio de sesión.
				{/if}
			</Card.Description>
		</Card.Header>
		<form method="post" action={enPasoDelCodigo ? '?/loginCode' : '?/login'}>
			<Card.Content>
				<div class="grid w-full items-center gap-4">
					{#if form?.message}
						<div
							role="alert"
							class="rounded-md border border-rose-300 bg-rose-50 px-3 py-2 text-sm text-rose-800 dark:border-rose-800 dark:bg-rose-950 dark:text-rose-200"
						>
							{form.message}
						</div>
					{/if}
					<div class="flex flex-col space-y-1.5">
						{#if enPasoDelCodigo}
							<Input type="hidden" id="username" name="username" value={form?.username} />
							<div>
								<Label for="code">Código</Label>
								<Input class="m-auto w-32 text-center text-3xl font-bold text-sky-800" id="code" name="code" autofocus />
							</div>
						{:else}
							<Label for="username">Correo electrónico</Label>
							<div class="flex flex-row items-center gap-2">
								<Input id="username" name="username" autofocus value={form?.username ?? ''} />
								<span>@cendoj.ramajudicial.gov.co</span>
							</div>
						{/if}
					</div>
				</div>
			</Card.Content>
			<Card.Footer class="flex justify-center">
				<Button type="submit">Enviar</Button>
			</Card.Footer>
		</form>
	</Card.Root>
</div>
