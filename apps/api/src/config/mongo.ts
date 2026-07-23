import mongoose from "mongoose";

export async function connectMongo(uri: string): Promise<typeof mongoose> {
  mongoose.set("strictQuery", true);
  // maxIdleTimeMS lets @vercel/functions attachDatabasePool recognize the Mongo pool.
  return mongoose.connect(uri, { maxIdleTimeMS: 10_000 });
}

export async function disconnectMongo(): Promise<void> {
  await mongoose.disconnect();
}
