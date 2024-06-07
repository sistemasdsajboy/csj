<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import type { ActionData } from './$types';

	export let form: ActionData;
</script>

<div class="flex flex-row justify-center p-8">
	<Card.Root class="w-[350px] text-center">
		<Card.Header>
			<Card.Title>Iniciar sesión</Card.Title>
			<Card.Description
				>{#if form?.success}
					Se ha enviado un correo electronico a {form.username}@cendoj.ramajudicial.gov.co con el
					código de inicio de sesión.
				{:else}
					Escriba su nombre de usuario de correo personal institucional para recibir el código de
					inicio de sesión.
				{/if}
			</Card.Description>
		</Card.Header>
		<form method="post" action={form?.success ? '?/loginCode' : '?/login'}>
			<Card.Content>
				<div class="grid w-full items-center gap-4">
					<div class="flex flex-col space-y-1.5">
						{#if form?.success}
							<Input type="hidden" id="username" name="username" value={form.username} />
							<div>
								<Label for="code">Código</Label>
								<Input
									class="m-auto w-32 text-center text-3xl font-bold text-sky-800"
									id="code"
									name="code"
									autofocus
								/>
							</div>
						{:else}
							<Label for="username">Correo electrónico</Label>
							<div class="flex flex-row items-center gap-2">
								<Input id="username" name="username" autofocus />
								<span>@cendoj.ramajudicial.gov.co</span>
							</div>
						{/if}
					</div>
					<div class="flex flex-col space-y-1.5"></div>
				</div>
			</Card.Content>
			<Card.Footer class="flex justify-center">
				<Button type="submit">Enviar</Button>
			</Card.Footer>
		</form>
	</Card.Root>
</div>
