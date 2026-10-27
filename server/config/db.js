import mongoose from 'mongoose';
import config from './index.js';

let isConnected = false;

export async function connectDB(uri = config.mongoUri) {
  if (isConnected && mongoose.connection.readyState === 1) {
    return mongoose.connection;
  }

  try {
    const conn = await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 3000,
      connectTimeoutMS: 5000
    });
    isConnected = true;
    console.log(`[ResQNet DB] Connected to MongoDB: ${conn.connection.host}:${conn.connection.port}/${conn.connection.name}`);
    return conn.connection;
  } catch (error) {
    isConnected = false;
    console.error(`[ResQNet DB ERROR] MongoDB connection failed: ${error.message}`);
    throw error;
  }
}

export async function disconnectDB() {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
    isConnected = false;
    console.log('[ResQNet DB] Disconnected from MongoDB');
  }
}

export function isDbConnected() {
  return mongoose.connection.readyState === 1;
}

export default { connectDB, disconnectDB, isDbConnected };
