import mongoose from 'mongoose';

declare global {
  // eslint-disable-next-line no-var
  var __mongooseConn: { conn: typeof mongoose | null; promise: Promise<typeof mongoose> | null } | undefined;
}

const cached =
  global.__mongooseConn ?? (global.__mongooseConn = { conn: null, promise: null });

export async function connectDb() {
  if (cached.conn) return cached.conn;

  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error('MONGODB_URI is not set. Add it to .env.local');
  }

  if (!cached.promise) {
    cached.promise = mongoose
      .connect(uri, {
        bufferCommands: false,
        serverSelectionTimeoutMS: 8000,
      })
      .then((m) => m);
  }

  cached.conn = await cached.promise;
  return cached.conn;
}
