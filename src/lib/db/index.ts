import type { GradeAccumulatedData } from '$lib/core/calificaciones';

import { connect, formatDocument, formatDocuments } from '$lib/db/mongo-client';
import { ObjectId } from 'mongodb';

export type NovedadRegistroCalificacion = {
	type: string;
	from: Date;
	to: Date;
	days: number;
	notes: string;
};

export type RegistroCalificacion = {
	despacho: string;
	data: GradeAccumulatedData[];
	funcionarios: string[];
	novedades?: NovedadRegistroCalificacion[];
};

const { db } = await connect();
export const registroCalificacion = db.collection<RegistroCalificacion>('registroCalificacion');

export async function getRegistrosCalificacion() {
	const registros = await registroCalificacion.find({}).toArray();
	return formatDocuments(registros);
}

export async function getRegistroCalificacionById(despachoId: string) {
	const registro = await registroCalificacion.findOne({ _id: new ObjectId(despachoId) });
	return formatDocument(registro);
}

export async function getRegistroCalificacionByDespacho(despacho: string) {
	const registro = await registroCalificacion.findOne({ despacho });
	return formatDocument(registro);
}

export async function createRegistroCalificacion(registro: RegistroCalificacion) {
	registroCalificacion.insertOne(registro);
}

export async function addNovedadToRegistroCalificacion(
	despachoId: string,
	novedad: NovedadRegistroCalificacion
) {
	const registro = await getRegistroCalificacionById(despachoId);
	if (!registro) return;
	registroCalificacion.updateOne(
		{ _id: new ObjectId(despachoId) },
		{ $push: { novedades: novedad } }
	);
}
