import { describe, expect, it } from 'vitest';
import xlsx from 'node-xlsx';
import { db } from '$lib/server/db-client';
import { createRegistrosCalificacionFromXlsx } from './carga-xlsx';

// PRUEBA DE INTEGRACIÓN — escribe en la base de datos.
//
// No corre con `vitest run` a secas. Hay que pedirla a propósito:
//
//   PRUEBA_INTEGRACION=1 DATABASE_URL="<cluster de desarrollo>" vitest run carga-xlsx.integracion
//
// Antes hay que sembrar el escenario: node scripts/seed-desarrollo.mjs
const url = process.env.DATABASE_URL ?? '';
const esDesarrollo =
	/^mongodb:\/\/(127\.0\.0\.1|localhost)[:/]/.test(url) ||
	/@csj-desarrollo\.[a-z0-9]+\.mongodb\.net/.test(url) ||
	/ac-wmgm4fk-shard-\d+-\d+\./.test(url);

const activa = process.env.PRUEBA_INTEGRACION === '1' && esDesarrollo;

const NOMBRE = 'JUZGADO 001 CIVIL MUNICIPAL DE CHIQUINQUIRA';
const COD_VIGENTE = '151764003001';
const COD_NUEVO = '151764993001'; // el código que traería un consolidado posterior

/** Arma un consolidado con el formato que espera el importador. */
function consolidado(codigo: string, nombreJuzgado: string, desde: string, hasta: string) {
	const encabezado = [`Despacho: ${codigo} - ${nombreJuzgado}`];
	const funcionario = 'Funcionario: WILSON PRUEBA ORTEGA 99999999';
	// Las dos columnas vacías son las que el importador descarta.
	const fila = ['1. Sentencias', funcionario, desde, hasta, 10, 20, 30, 25, 0, 5, undefined, undefined, 5, 30];
	return Buffer.from(xlsx.build([{ name: 'oral', data: [encabezado, fila], options: {} }]));
}

describe.skipIf(!activa)('carga de consolidado contra la base', () => {
	it('un juzgado que cambió de código NO genera un despacho nuevo', async () => {
		const antes = await db.despacho.findMany({ where: { nombre: NOMBRE } });
		expect(antes.length).toBeGreaterThan(0);

		const archivo = new File([consolidado(COD_NUEVO, NOMBRE, '01/DIC/2025', '31/DIC/2025')], 'consolidado.xlsx');
		const resultado = await createRegistrosCalificacionFromXlsx(archivo);

		const despues = await db.despacho.findMany({ where: { nombre: NOMBRE } });

		// Lo esencial: el importador reconoció el juzgado y no abrió otro registro.
		expect(despues.length).toBe(antes.length);

		// Y le puso el código que trae el archivo, por ser el más reciente.
		expect(despues.map((d) => d.codigo)).toContain(COD_NUEVO);

		// El aviso del cambio de código llega al usuario.
		expect(resultado.avisos.join(' ')).toContain('cambió de código');

		// Y como el juzgado sigue partido en dos, también avisa de eso.
		expect(resultado.avisos.join(' ')).toContain('registros en el sistema');
	});

	it('recargar el mismo archivo tampoco duplica el despacho', async () => {
		const antes = await db.despacho.count({ where: { nombre: NOMBRE } });

		const archivo = new File([consolidado(COD_NUEVO, NOMBRE, '01/DIC/2025', '31/DIC/2025')], 'consolidado.xlsx');
		await createRegistrosCalificacionFromXlsx(archivo);

		expect(await db.despacho.count({ where: { nombre: NOMBRE } })).toBe(antes);
	});

	it('un juzgado que de verdad no existe sí se crea', async () => {
		const NUEVO = 'JUZGADO 999 PRUEBA INTEGRACION DE TUNJA';
		await db.despacho.deleteMany({ where: { nombre: NUEVO } });

		const archivo = new File([consolidado('150014099999', NUEVO, '01/DIC/2025', '31/DIC/2025')], 'consolidado.xlsx');
		await createRegistrosCalificacionFromXlsx(archivo);

		const creado = await db.despacho.findMany({ where: { nombre: NUEVO } });
		expect(creado.length).toBe(1);
		expect(creado[0].codigo).toBe('150014099999');

		// Limpieza: este juzgado no existe, no debe quedar en la base de pruebas.
		await db.registroCalificacion.deleteMany({ where: { despachoId: creado[0].id } });
		await db.despacho.deleteMany({ where: { id: creado[0].id } });
	});
});
