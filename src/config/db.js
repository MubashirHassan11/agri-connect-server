import mongoose from 'mongoose';
import env from './env.js';
import logger from '../utils/logger.js';

const globalAny = global;

const cached =
  globalAny.__mongooseCache || (globalAny.__mongooseCache = { conn: null, promise: null });

const connectDB = async () => {
  try {
    if (!env.MONGO_URI) {
      logger.error('MONGO_URI is not set in environment variables');
      throw new Error('MONGO_URI is not set in environment variables');
    }

    if (cached.conn) {
      return cached.conn;
    }

    if (!cached.promise) {
      cached.promise = mongoose
        .connect(env.MONGO_URI)
        .then((mongooseInstance) => {
          cached.conn = mongooseInstance;
          logger.info('MongoDB connected successfully');
          return cached.conn;
        })
        .catch((error) => {
          cached.promise = null;
          logger.error('MongoDB connection error', {
            message: error.message,
            name: error.name,
            code: error.code
          });
          throw error;
        });
    }

    return cached.promise;
  } catch (error) {
    throw new Error('MongoDB connection failed');
  }
};

export default connectDB;
