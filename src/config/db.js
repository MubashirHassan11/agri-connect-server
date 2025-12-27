import mongoose from 'mongoose';
import env from './env.js';
import logger from '../utils/logger.js';

const connectDB = async () => {
  try {
    if (!env.MONGO_URI) {
      logger.error('MONGO_URI is not set in environment variables');
      throw new Error('MONGO_URI is not set in environment variables');
    }

    await mongoose.connect(env.MONGO_URI);

    logger.info('MongoDB connected successfully');
  } catch (error) {
    logger.error('MongoDB connection error', {
      message: error.message,
      name: error.name,
      code: error.code
    });
    throw new Error('MongoDB connection failed');
  }
};

export default connectDB;
