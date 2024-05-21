import { MONGO_DB_NAME, MONGO_URL } from '$env/static/private';
import { type Db, MongoClient, ServerApiVersion, type WithId } from 'mongodb';

const uri = `${MONGO_URL}/?retryWrites=true&w=majority`;

let cachedClient: MongoClient;
let cachedDb: Db;

export async function connect() {
	if (!cachedClient || !cachedDb) {
		const client: MongoClient = new MongoClient(uri, { serverApi: ServerApiVersion.v1 });
		cachedClient = await client.connect();
		cachedDb = client.db(MONGO_DB_NAME);
	}

	return {
		client: cachedClient,
		db: cachedDb
	};
}

export function formatDocument<T>(doc: WithId<T> | null) {
	if (!doc) return null;

	const { _id, ...fields } = doc;
	return { ...fields, id: doc._id.toString() };
}

export function formatDocuments<T>(docs: WithId<T>[]) {
	return docs.map((doc) => {
		const { _id, ...fields } = doc;
		return { ...fields, id: doc._id.toString() };
	});
}
