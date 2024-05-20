import type { GradeAccumulatedData } from '$lib/core/calificaciones';
import fs from 'node:fs';

export type RegistroPorCalificar = {
	despacho: string;
	data: GradeAccumulatedData[];
	funcionarios: string[];
};
let records: RegistroPorCalificar[] = [];

export async function getRegistrosPorCalificar() {
	const data = fs.readFileSync('./static/records.json', 'utf8');
	records = JSON.parse(data);
	return records;
}
export async function createRegistroPorCalificar(registro: RegistroPorCalificar) {
	records.push(registro);
	fs.writeFileSync('./static/records.json', JSON.stringify(records));
}

export async function getRegistroPorCalificarByDespacho(despacho: string) {
	return records.find((r) => r.despacho === despacho);
}
