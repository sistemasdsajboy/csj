import type { GradeAccumulatedData } from '$lib/core/calificaciones';

export type RegistroPorCalificar = {
	despacho: string;
	data: GradeAccumulatedData[];
	funcionarios: string[];
};
const records: RegistroPorCalificar[] = [];

export async function getRegistrosPorCalificar() {
	return records;
}
export async function createRegistroPorCalificar(registro: RegistroPorCalificar) {
	records.push(registro);
}

export async function getRegistroPorCalificarByDespacho(despacho: string) {
	return records.find((r) => r.despacho === despacho);
}
