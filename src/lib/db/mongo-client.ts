import { Collection, Db, MongoClient, ServerApiVersion } from 'mongodb';
import { MONGO_URL, MONGO_DB_NAME } from '$env/static/private';

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
