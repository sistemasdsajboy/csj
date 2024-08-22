import playwright from 'playwright';
import _ from 'lodash';

const USERNAME = '7181680';
const PASSWORD = 'Aw@VCTExQk%2vRSq';
const URL = 'https://sistemaestadistico.ramajudicial.gov.co/Sierju-Web/app/login';
// "http://190.217.24.71:7003/Sierju-Web/app/login";
// "http://190.217.24.72:7003/Sierju-Web/app/login";

// Configuración de backoff exponencial para reintentos.
const BASE = 1.5;
const MULTIPLICADOR = 3;
const MAX_REINTENTOS = 3;
const PERIODO = 2023;
const CODIGOS_DESPACHO = ['851624089001'];

async function iniciarSesion(page) {
	await page.goto(URL);

	await page.fill("[name='j_username']", USERNAME);
	await page.fill("[name='j_password']", PASSWORD);
	await page.click("[type='submit']");
	await wait(5000);
}

async function irAPaginaDescarga(page) {
	const linkVisible = await page.getByText('Reporte Actividad Diligenciamiento').isVisible();
	if (!linkVisible) {
		await page.getByText('Gestión Reportes').click();
		await page.waitForResponse((resp) => resp.status() === 200);
		await wait(1000);
	}
	await page.getByText('Reporte Actividad Diligenciamiento').click();
	await wait(1000);
}

function wait(ms) {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

const browser = await playwright.chromium.launch({
	headless: true,
	slowMo: 50
});
const context = await browser.newContext({
	viewport: { width: 1920, height: 1200 }
});

async function descargarDatosDespachoSierju(periodo, codigoDespacho) {
	const page = await context.newPage();

	await iniciarSesion(page);
	await irAPaginaDescarga(page);

	// Consultar reportes del despacho en el periodo especificado
	await page.fill("[name='formReporteFuncionario:inputFunDespacho']", codigoDespacho);
	await page.fill("[name='formReporteFuncionario:fechaInicio_input']", `01/01/${periodo}`);
	await page.fill("[name='formReporteFuncionario:fechaFin_input']", `31/12/${periodo}`);

	// Hacer clic doble para esperar que el botón "submit" esté habilitado.
	await page.click("[type='submit']");
	await page.click("[type='submit']");
	await page.waitForResponse((resp) => resp.request().method() === 'GET' && resp.status() === 200);
	await wait(1000);

	const textoSinResultados = await page.getByText('No hay Resultados para mostrar').isVisible();
	if (textoSinResultados) {
		console.error(`Codigo de despacho no encontrado: ${codigoDespacho}`);
		return true;
	}

	// Captura de pantalla del listado de reportes del despacho en el periodo
	await page.screenshot({ path: `./${codigoDespacho}/imgs/listado.png` });

	const columnas = [
		'despacho',
		'codigoDespacho',
		'funcionario',
		'reportado',
		'periodoReportado',
		'idFormulario',
		'codigoFormulario',
		'nombre', //contiene enlace hacia página de descarga.
		'estado'
	];

	const datosFilas: Array<_.Dictionary<string>> = [];

	const filas = await page.$$("[id='formReporteFuncionario:tablerReporteInformes_data'] tr");

	for await (const fila of filas) {
		const celdas = await fila.$$('td');
		const textoCeldas = await Promise.all(celdas.map((c) => c.innerText()));
		const datosFila = _.zipObject(columnas, textoCeldas);
		datosFila.enlace = await (await celdas[7].$('a'))?.getAttribute('id');

		datosFilas.push(datosFila);
	}

	// Filtrar datos para seleccionar solo los periodos finalizados a descargar
	const datosFilasParaExportar = _(datosFilas)
		.filter((fila) => fila.estado.includes('Finalizado'))
		.sortBy('reportado')
		.reverse()
		.groupBy('periodoReportado')
		.flatMap((i) => i[0])
		.sortBy('periodoReportado')
		.value();

	console.table(datosFilasParaExportar);

	// Ir a la página de detalle de cada uno de los reportes y descargar el archivo xls
	for await (const fila of datosFilasParaExportar) {
		await page.click(`[id='${fila.enlace}']`);
		await page.waitForResponse((resp) => resp.status() === 200);
		await page.waitForResponse(
			(resp) => resp.request().method() === 'POST' && resp.status() === 200
		);

		const enlaceDescarga = await page.$("[id='formFormulariosRecuperar:j_idt102']");

		if (enlaceDescarga) {
			// Descargar archivo xls
			const [download] = await Promise.all([
				page.waitForEvent('download', { timeout: 60000 }),
				enlaceDescarga.click()
			]);

			await download.saveAs(`./${codigoDespacho}/${fila.periodoReportado}.xls`);
			console.log('Descargado:', `${fila.periodoReportado}.xls`);
		}

		// Guardar la captura de pantalla de la página de detalle del reporte descargado.
		await page.screenshot({
			path: `./${codigoDespacho}/imgs/${fila.periodoReportado}.png`
		});

		await page.getByText('Reporte Actividad Diligenciamiento').click();
		await page.waitForResponse((resp) => resp.status() === 200);
	}

	console.log(`Descarga de ${codigoDespacho} completa.\n`);
	return true;
}



async function iniciar() {
	for await (const codigoDespacho of CODIGOS_DESPACHO) {
		let resultado = false;
		let intentos = 0;

		do {
			try {
				if (intentos === 0) console.log(`Descargando ${codigoDespacho} ...`);
				else console.log(`Reintento ${intentos} ...`);
				resultado = await descargarDatosDespachoSierju(PERIODO, codigoDespacho);
			} catch (error) {
				console.log(error);
				// Ignorar errores y reintentar ...
			}

			if (!resultado) {
				intentos++;
				const tiempoReintento = Math.round(BASE * MULTIPLICADOR ** intentos);
				console.error(
					`Error en la descarga del despacho ${codigoDespacho}. Reintento ${intentos} en ${tiempoReintento} segundos`
				);
				await wait(tiempoReintento * 1000);
			}
		} while (!resultado && intentos <= MAX_REINTENTOS);
	}
}

iniciar()
	.catch((error) => {
		console.error(error);
		process.exit(1);
	})
	.finally(async () => {
		await context.clearCookies();
		await context.close();
		await browser.close();
	});
