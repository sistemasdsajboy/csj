/**
 * Revisa registros de Funcionario que podrían estar de más. SOLO LEE.
 *
 * IMPORTANTE — la convención de encargos
 *
 *   Que una persona aparezca dos veces NO significa que haya un error. Cuando
 *   un funcionario sirve ENCARGADO en otro despacho, la oficina le crea un
 *   registro aparte con SU CEDULA MAS UN DIGITO, para que esa gestión se
 *   califique por separado.
 *
 *   Por eso, si de dos registros con el mismo nombre uno tiene el documento del
 *   otro más un dígito al final, lo más probable es que sea un encargo y NO hay
 *   que fusionarlos: hacerlo destruiría la distinción que la oficina mantiene a
 *   propósito. Este script los marca como "posible encargo".
 *
 * Lo que sí es un problema
 *
 *   carga-xlsx.ts empareja al funcionario por documento. Si el documento no se
 *   puede leer del archivo queda en cadena vacía, y antes la búsqueda se
 *   quedaba con el primer registro de documento vacío que encontrara: dos
 *   personas distintas podían terminar en uno solo. Eso ya está corregido en el
 *   código, pero este script sirve para comprobar si alcanzó a ocurrir.
 *
 * Este script no corrige nada. Reúne evidencia para que alguien de la oficina
 * decida, que es donde está el conocimiento de quién estuvo encargado dónde.
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
	console.log('OJO: si un documento es el otro mas un digito, lo normal es que sea un');
	console.log('ENCARGO en otro despacho, no un error. NO fusionar sin preguntar.\n');
	for (const fs of repetidos) {
		console.log(`── ${fs[0].nombre}`);
		for (const f of fs) await imprimir(f);
		const docs = fs.map((f) => (f.documento ?? '').trim()).sort((a, b) => a.length - b.length);
		const pareceEncargo = docs.length === 2 && docs[1].length === docs[0].length + 1 && docs[1].startsWith(docs[0]);
		console.log(
			pareceEncargo
				? '   -> PATRON DE ENCARGO: el segundo es el primero mas un digito. Probablemente correcto.'
				: '   -> los documentos no siguen el patron de encargo: revisar caso por caso.'
		);
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
	console.log('Antes de tocar nada hay que distinguir tres casos, y solo la oficina');
	console.log('puede hacerlo:');
	console.log('  a) ENCARGO en otro despacho -> correcto, NO se fusiona.');
	console.log('  b) Dos registros de la misma persona por error -> se fusionan.');
	console.log('  c) Dos personas distintas mezcladas -> hay que separarlas, y revisar');
	console.log('     las calificaciones ya emitidas de ambas.');
	console.log('');
}

main()
	.catch((e) => {
		console.error('\nFallo:', e.message);
		process.exit(1);
	})
	.finally(() => db.$disconnect());
