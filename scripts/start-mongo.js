import { MongoMemoryServer } from 'mongodb-memory-server';
import fs from 'fs';
import path from 'path';

const dbPath = path.resolve(process.cwd(), '.mongodb_data');
if (!fs.existsSync(dbPath)) {
  fs.mkdirSync(dbPath, { recursive: true });
}

console.log('Starting local MongoDB server on port 27017...');
try {
  const mongod = await MongoMemoryServer.create({
    instance: {
      port: 27017,
      dbPath: dbPath,
      storageEngine: 'wiredTiger'
    }
  });

  const uri = mongod.getUri();
  console.log(`[Local MongoDB] Successfully started! URI: ${uri}`);
  console.log(`[Local MongoDB] Storage path: ${dbPath}`);

  const shutdown = async () => {
    console.log('[Local MongoDB] Shutting down...');
    await mongod.stop();
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
} catch (err) {
  console.error('[Local MongoDB Error]', err);
  process.exit(1);
}
