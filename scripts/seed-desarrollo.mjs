/**
 * Datos de desarrollo para el sistema de calificaciones.
 *
 * Reproduce el caso real detectado en producción: un juzgado que cambió de
 * código quedó partido en dos registros de Despacho, y el mismo funcionario
 * tiene registros bajo ambos en el mismo periodo.
 *
 * Consecuencia esperada al generar la calificación:
 *   generar-calificacion.ts trata los dos códigos como despachos distintos,
 *   uno de ellos queda con diasHabilesDespacho = 0, y la línea 137
 *       (cargaBaseCalificacionDespacho * diasHabilesFuncionario) / diasHabilesDespacho
 *   produce NaN. Prisma rechaza NaN y aborta con
 *       "Argument `cargaProporcional` is missing".
 *
 * Todos los datos son FICTICIOS. Los códigos de despacho son los reales
 * porque el patrón del cambio es lo que se está reproduciendo; el funcionario,
 * las cifras y las fechas son inventados.
 *
 * Uso:  node scripts/seed-desarrollo.mjs
 */

import { PrismaClient } from '@prisma/client';
import { readFileSync } from 'node:fs';

// --- Carga de .env ---------------------------------------------------------
try {
	for (const linea of readFileSync('.env', 'utf8').split('\n')) {
		const m = linea.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*)\s*$/);
		if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
	}
} catch {
	console.error('No se encontró el archivo .env');
	process.exit(1);
}

// --- SALVAGUARDA ------------------------------------------------------------
// Este script ESCRIBE y BORRA. Solo puede correr contra una base local.
const url = process.env.DATABASE_URL ?? '';
const esLocal = /^mongodb:\/\/(127\.0\.0\.1|localhost)[:/]/.test(url);

if (!esLocal) {
	console.error('\n╔═══════════════════════════════════════════════════════════╗');
	console.error('║  ABORTADO: este script escribe y borra datos de prueba.   ║');
	console.error('║  Solo puede ejecutarse contra una base LOCAL.             ║');
	console.error('╚═══════════════════════════════════════════════════════════╝\n');
	console.error('DATABASE_URL apunta a:', url.replace(/:[^:@/]+@/, ':****@') || '(vacío)');
	console.error('\nSe esperaba algo como: mongodb://127.0.0.1:27018/...\n');
	process.exit(1);
}

const db = new PrismaClient();

// Caso real: JUZGADO 001 CIVIL MUNICIPAL DE CHIQUINQUIRA
const NOMBRE = 'JUZGADO 001 CIVIL MUNICIPAL DE CHIQUINQUIRA';
const COD_ANTIGUO = '151764053001'; // arrastra 2023-2024 y parte de 2025
const COD_VIGENTE = '151764003001'; // aparece solo en 2025 — confirmado por Hugo
const DOCUMENTO = '99999999';
const PERIODO = 2025;

async function limpiarDatosDePrueba() {
	// Solo borra lo que este mismo script crea, identificado por código y documento.
	const despachos = await db.despacho.findMany({
		where: { codigo: { in: [COD_ANTIGUO, COD_VIGENTE] } },
		select: { id: true }
	});
	const ids = despachos.map((d) => d.id);
	if (ids.length) {
		await db.calificacionSubfactor.deleteMany({
			where: { calificacion: { despachoId: { in: ids } } }
		});
		await db.calificacionDespacho.deleteMany({ where: { despachoId: { in: ids } } });
		await db.registroCalificacion.deleteMany({ where: { despachoId: { in: ids } } });
		await db.registroAudiencias.deleteMany({ where: { despachoId: { in: ids } } });
		await db.despacho.deleteMany({ where: { id: { in: ids } } });
	}
	const func = await db.funcionario.findFirst({ where: { documento: DOCUMENTO } });
	if (func) {
		await db.calificacionPeriodo.deleteMany({ where: { funcionarioId: func.id } });
		await db.funcionario.delete({ where: { id: func.id } });
	}
	return ids.length;
}

// Registro de estadísticas con cifras plausibles.
function registro({ despachoId, funcionarioId, desde, hasta, dias, clase, categoria }) {
	return {
		periodo: PERIODO,
		despachoId,
		funcionarioId,
		clase,
		categoria,
		desde: new Date(desde),
		hasta: new Date(hasta),
		dias,
		inventarioInicial: 120,
		ingresoEfectivo: 200,
		cargaEfectiva: 320,
		egresoEfectivo: 180,
		conciliaciones: 5,
		inventarioFinal: 140,
		restan: 140,
		cargaBruta: 330
	};
}

async function main() {
	console.log('Base de datos:', url.replace(/:[^:@/]+@/, ':****@'));

	const borrados = await limpiarDatosDePrueba();
	if (borrados) console.log(`Limpieza previa: ${borrados} despacho(s) de prueba eliminados.`);
	console.log('');

	const tipo = await db.tipoDespacho.upsert({
		where: { nombre: 'Juzgado Civil Municipal' },
		update: {},
		create: { nombre: 'Juzgado Civil Municipal', especialidad: 'Civil', categoria: 'Municipal' }
	});

	// La generación consulta la capacidad máxima por tipo y periodo.
	const yaHayCapacidad = await db.capacidadMaximaRespuesta.findFirst({
		where: { tipoDespachoId: tipo.id, periodo: PERIODO }
	});
	if (!yaHayCapacidad) {
		await db.capacidadMaximaRespuesta.create({
			data: { tipoDespachoId: tipo.id, periodo: PERIODO, cantidad: 593 }
		});
	}

	const datosDespacho = {
		nombre: NOMBRE,
		numero: 1,
		tipoDespachoId: tipo.id,
		municipio: 'Chiquinquirá',
		distrito: 'Chiquinquirá'
	};

	const antiguo = await db.despacho.create({ data: { ...datosDespacho, codigo: COD_ANTIGUO } });
	const vigente = await db.despacho.create({ data: { ...datosDespacho, codigo: COD_VIGENTE } });

	const funcionario = await db.funcionario.create({
		data: { documento: DOCUMENTO, nombre: 'WILSON PRUEBA ORTEGA' }
	});

	const base = { funcionarioId: funcionario.id };

	// --- Bajo el código ANTIGUO: enero a junio, datos normales --------------
	for (const clase of ['oral', 'tutelas']) {
		await db.registroCalificacion.create({
			data: registro({
				...base,
				despachoId: antiguo.id,
				desde: '2025-01-01',
				hasta: '2025-06-30',
				dias: 120,
				clase,
				categoria: clase === 'tutelas' ? 'Movimiento de Tutelas' : 'Procesos Ordinarios'
			})
		});
	}

	// --- Bajo el código VIGENTE: rango degenerado ---------------------------
	// 2025-07-05 y 2025-07-06 son sábado y domingo: cero días hábiles.
	// Esto es lo que hace que diasHabilesDespacho quede en 0 y aparezca el NaN.
	for (const clase of ['oral', 'tutelas']) {
		await db.registroCalificacion.create({
			data: registro({
				...base,
				despachoId: vigente.id,
				desde: '2025-07-05',
				hasta: '2025-07-06',
				dias: 0,
				clase,
				categoria: clase === 'tutelas' ? 'Movimiento de Tutelas' : 'Procesos Ordinarios'
			})
		});
	}

	// La generación exige un registro de audiencias por despacho.
	for (const d of [antiguo, vigente]) {
		await db.registroAudiencias.create({
			data: {
				periodo: PERIODO,
				despachoId: d.id,
				funcionarioId: funcionario.id,
				programadas: 90,
				atendidas: 74,
				aplazadasAjenas: 6,
				aplazadasJustificadas: 7,
				aplazadasNoJustificadas: 3
			}
		});
	}

	console.log('Escenario creado.\n');
	console.log(`  ${NOMBRE}`);
	console.log(`    ${COD_ANTIGUO}  (antiguo)  ${antiguo.id}   ene-jun 2025`);
	console.log(`    ${COD_VIGENTE}  (VIGENTE)  ${vigente.id}   05-06 jul 2025 (fin de semana)\n`);
	console.log(`  Funcionario: WILSON PRUEBA ORTEGA  ${funcionario.id}\n`);
	console.log('Para reproducir el error, abre en el navegador:');
	console.log(`  http://localhost:5173/funcionario/${funcionario.id}?periodo=${PERIODO}`);
	console.log('y pulsa "Ver calificación".\n');
}

main()
	.catch((e) => {
		console.error('\nFalló:', e.message);
		process.exit(1);
	})
	.finally(() => db.$disconnect());
