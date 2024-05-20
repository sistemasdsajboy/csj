import type { GradeAccumulatedData } from '$lib/core/calificaciones';

import { connect } from '$lib/db/mongo-client';
import type { WithId } from 'mongodb';

export type RegistroPorCalificar = {
	despacho: string;
	data: GradeAccumulatedData[];
	funcionarios: string[];
};

const { db } = await connect();
export const registroCalificacion = db.collection<RegistroPorCalificar>('registroCalificacion');

function formatDocument<T>(doc: WithId<T> | null) {
	if (!doc) return null;

	const { _id, ...fields } = doc;
	return { ...fields, id: doc._id.toString() };
}

function formatDocuments<T>(docs: WithId<T>[]) {
	return docs.map((doc) => {
		const { _id, ...fields } = doc;
		return { ...fields, id: doc._id.toString() };
	});
}

export async function getRegistrosPorCalificar() {
	const registros = await registroCalificacion.find({}).toArray();
	return formatDocuments(registros);
}

export async function getRegistroPorCalificarByDespacho(despacho: string) {
	const registro = await registroCalificacion.findOne({ despacho });
	return formatDocument(registro);
}

export async function createRegistroPorCalificar(registro: RegistroPorCalificar) {
	registroCalificacion.insertOne(registro);
}
