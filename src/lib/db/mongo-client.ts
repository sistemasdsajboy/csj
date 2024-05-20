import { MONGO_DB_NAME, MONGO_URL } from '$env/static/private';
import { type Db, MongoClient, ServerApiVersion, type WithId } from 'mongodb';

const uri = `${MONGO_URL}/?retryWrites=true&w=majority`;

let cachedClient: MongoClient;
let cachedDb: Db;

// const createBuilder =
// 	(client: MongoClient) =>
// 	<T extends Document>(collectionName: string): Collection<T> =>
// 		client.db(MONGO_DB_NAME).collection<T>(collectionName);

export async function connect() {
	if (!cachedClient || !cachedDb) {
		const client: MongoClient = new MongoClient(uri, { serverApi: ServerApiVersion.v1 });
		cachedClient = await client.connect();
		cachedDb = client.db(MONGO_DB_NAME);

		//   const buildCollection = createBuilder(client)

		//   cachedCollections = {
		//     users: buildCollection<User>('users'),
		//     sessions: buildCollection<Session>('sessions'),
		//   }
	}

	return {
		client: cachedClient,
		db: cachedDb
		// ...cachedCollections
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
