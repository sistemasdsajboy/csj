import { connect, formatDocument, formatDocuments } from '$lib/db/mongo-client';
import { ObjectId } from 'mongodb';
import type { NovedadRegistroCalificacion, RegistroCalificacion } from './schema';

const { db } = await connect();
const registroCalificacionCollection = db.collection<RegistroCalificacion>('registroCalificacion');

async function getAll() {
	const registros = await registroCalificacionCollection.find({}).toArray();
	return formatDocuments(registros);
}

async function getById(despachoId: string) {
	const registro = await registroCalificacionCollection.findOne({
		_id: new ObjectId(despachoId)
	});
	return formatDocument(registro);
}

async function getByDespacho(despacho: string) {
	const registro = await registroCalificacionCollection.findOne({ despacho });
	return formatDocument(registro);
}

async function create(registro: RegistroCalificacion) {
	registroCalificacionCollection.insertOne(registro);
}

async function addNovedad(despachoId: string, novedad: NovedadRegistroCalificacion) {
	const registro = await getById(despachoId);
	if (!registro) return;
	registroCalificacionCollection.updateOne(
		{ _id: new ObjectId(despachoId) },
		{ $push: { novedades: novedad } }
	);
}

export const registroCalificacion = {
	getAll,
	getById,
	getByDespacho,
	create,
	addNovedad
};
