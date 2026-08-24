/**
 * Revisa duplicados y documentos vacíos en Funcionario. SOLO LEE.
 *
 * carga-xlsx.ts empareja al funcionario únicamente por documento. Si el
 * documento del archivo no coincide con el guardado -un cero de más, un
 * espacio al final que rompe el /[0-9]+$/, un digito distinto- no reconoce a
 * la persona y crea otro registro. Sus estadísticas quedan repartidas entre
 * dos, y la interfaz muestra el mismo nombre dos veces.
 *
 * Peor aún: si el documento no se puede leer queda en '', y la búsqueda
 * `findFirst({ where: { documento: '' } })` empareja con CUALQUIER otro de
 * documento vacío. Dos personas distintas terminarían en un solo registro.
 *
 * Este script no corrige nada. Reúne la evidencia para decidir qué hacer con
 * cada caso, que es una decisión de la oficina y no del programa: fusionar dos
 * registros de la misma persona no es lo mismo que separar dos personas que
 * quedaron mezcladas.
 *
 *   node scripts/revisar-funcionarios.mjs
 *
 * NO ESCRIBE NADA. Se puede correr contra producción sin riesgo.
 */

import { PrismaClient } from '@prisma/client';
import { readFileSync } from 'node:fs';

for (const linea of readFileSync('.env', 'utf8').split('\n')) {
	const m = linea.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*)\s*$/);
	if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
}

const url = process.env.DATABASE_URL ?? '';
console.log('');
console.log('  Base de datos:', url.replace(/:[^:@/]+@/, ':****@'));
console.log('  Modo:          SOLO LECTURA');
console.log('');

const db = new PrismaClient();

const normalizar = (s) =>
	(s ?? '')
		.normalize('NFKD')
		.replace(/[\u0300-\u036f]/g, '')
		.replace(/[^A-Za-z0-9]+/g, ' ')
		.trim()
		.toUpperCase();

async function detalle(f) {
	const registros = await db.registroCalificacion.findMany({
		where: { funcionarioId: f.id },
		select: { periodo: true, despacho: { select: { codigo: true, nombre: true } } },
	});
	const periodos = [...new Set(registros.map((r) => r.periodo))].sort();
	const despachos = [...new Set(registros.map((r) => `${r.despacho?.codigo} ${r.despacho?.nombre}`))];
	const calificaciones = await db.calificacionPeriodo.count({ where: { funcionarioId: f.id } });
	return { periodos, despachos, nRegistros: registros.length, calificaciones };
}

async function imprimir(f, marca = '') {
	const d = await detalle(f);
	console.log(`   ${marca}${f.id}`);
	console.log(`      documento:      ${JSON.stringify(f.documento)}`);
	console.log(`      nombre:         ${f.nombre}`);
	console.log(`      periodos:       ${d.periodos.join(', ') || '(ninguno)'}`);
	console.log(`      registros:      ${d.nRegistros}`);
	console.log(`      calificaciones: ${d.calificaciones}`);
	for (const dp of d.despachos) console.log(`      despacho:       ${dp}`);
	return d;
}

async function main() {
	const todos = await db.funcionario.findMany({ orderBy: { nombre: 'asc' } });
	console.log(`Funcionarios en la base: ${todos.length}\n`);

	// 1. Mismo nombre, más de un registro: la persona quedó partida.
	const porNombre = new Map();
	for (const f of todos) {
		const k = normalizar(f.nombre);
		if (!porNombre.has(k)) porNombre.set(k, []);
		porNombre.get(k).push(f);
	}
	const repetidos = [...porNombre.values()].filter((fs) => fs.length > 1);

	console.log('─'.repeat(70));
	console.log(`MISMO NOMBRE EN MAS DE UN REGISTRO: ${repetidos.length}`);
	console.log('Probable causa: el documento del archivo no coincidio con el guardado.');
	console.log('Sus estadisticas estan repartidas entre dos registros.\n');
	for (const fs of repetidos) {
		console.log(`── ${fs[0].nombre}`);
		for (const f of fs) await imprimir(f);
		console.log('');
	}

	// 2. Documento vacío: cualquier carga futura se emparejaría con el primero.
	const sinDocumento = todos.filter((f) => !f.documento || !f.documento.trim());
	console.log('─'.repeat(70));
	console.log(`DOCUMENTO VACIO: ${sinDocumento.length}`);
	if (sinDocumento.length > 1) {
		console.log('*** ATENCION: hay mas de uno. findFirst({ documento: "" }) empareja');
		console.log('*** siempre con el primero, asi que estadisticas de personas distintas');
		console.log('*** pueden haber quedado en un mismo registro. Revisar uno por uno.\n');
	} else if (sinDocumento.length === 1) {
		console.log('Solo uno: por ahora no ha podido mezclar a dos personas.\n');
	} else {
		console.log('Ninguno.\n');
	}
	for (const f of sinDocumento) await imprimir(f);

	// 3. Documentos que solo se diferencian por ceros o signos.
	const porDocumento = new Map();
	for (const f of todos) {
		const k = (f.documento ?? '').replace(/\D/g, '').replace(/^0+/, '');
		if (!k) continue;
		if (!porDocumento.has(k)) porDocumento.set(k, []);
		porDocumento.get(k).push(f);
	}
	const casiIguales = [...porDocumento.values()].filter((fs) => fs.length > 1);

	console.log('');
	console.log('─'.repeat(70));
	console.log(`MISMO DOCUMENTO SALVO CEROS O SIGNOS: ${casiIguales.length}`);
	console.log('Es la misma persona escrita de dos formas.\n');
	for (const fs of casiIguales) {
		console.log(`── ${fs.map((f) => JSON.stringify(f.documento)).join('  vs  ')}`);
		for (const f of fs) await imprimir(f);
		console.log('');
	}

	console.log('─'.repeat(70));
	console.log('No se modifico nada. Este script solo lee.');
	console.log('');
	console.log('Antes de decidir la correccion hay que distinguir dos casos:');
	console.log('  a) Dos registros de la MISMA persona  -> se fusionan.');
	console.log('  b) Dos personas DISTINTAS mezcladas   -> hay que separarlas, y');
	console.log('     revisar las calificaciones ya emitidas de ambas.');
	console.log('');
}

main()
	.catch((e) => {
		console.error('\nFallo:', e.message);
		process.exit(1);
	})
	.finally(() => db.$disconnect());
