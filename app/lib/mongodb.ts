import "server-only";

import { Db, MongoClient, ServerApiVersion } from "mongodb";

const databaseName = process.env.MONGODB_DB ?? "gitcraft";

function getMongoUri(): string {
  const value = process.env.MONGODB_URI;
  if (!value) throw new Error("MONGODB_URI is not configured.");
  return value;
}

const uri = getMongoUri();

const options = {
  appName: "GitCraft",
  maxPoolSize: 10,
  minPoolSize: 0,
  maxIdleTimeMS: 30_000,
  serverSelectionTimeoutMS: 5_000,
  connectTimeoutMS: 10_000,
  retryReads: true,
  retryWrites: true,
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
};

declare global {
  var gitcraftMongoClientPromise: Promise<MongoClient> | undefined;
}

function createClientPromise() {
  return new MongoClient(uri, options).connect();
}

export const mongoClientPromise =
  process.env.NODE_ENV === "development"
    ? (global.gitcraftMongoClientPromise ??= createClientPromise())
    : createClientPromise();

export async function getDatabase(): Promise<Db> {
  const client = await mongoClientPromise;
  return client.db(databaseName);
}
