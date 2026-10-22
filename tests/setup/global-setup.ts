import { MongoMemoryServer } from 'mongodb-memory-server';
import type { TestProject } from 'vitest/node';
import { assertTestMongoUri } from './safe-uri';

declare module 'vitest' {
  export interface ProvidedContext {
    mongoUri: string;
  }
}

export default async function setup(project: TestProject) {
  const mongod = await MongoMemoryServer.create();
  const uri = mongod.getUri();
  assertTestMongoUri(uri, uri);
  project.provide('mongoUri', uri);

  // Teardown runs after all files finish, pass or fail.
  return async () => {
    await mongod.stop({ doCleanup: true, force: true });
  };
}
