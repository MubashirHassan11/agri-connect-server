import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });
const NODE_ENV = process.env.NODE_ENV || 'development';

export default {
  NODE_ENV,
  PORT: process.env.PORT,
  MONGO_URI: process.env.MONGO_URI,
  JWT_SECRET: process.env.JWT_SECRET,
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN,
  DEPLOYED_URL: process.env.DEPLOYED_URL,
  LOG_LEVEL: process.env.LOG_LEVEL?.toUpperCase() || (NODE_ENV === 'production' ? 'INFO' : 'DEBUG')
};
