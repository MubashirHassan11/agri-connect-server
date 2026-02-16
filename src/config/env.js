import dotenv from 'dotenv';

dotenv.config({path: '.env.local'});
const NODE_ENV = process.env.NODE_ENV || 'development';

export default {
  NODE_ENV,
  PORT: process.env.PORT,
  MONGO_URI: process.env.MONGO_URI,
  JWT_SECRET: process.env.JWT_SECRET,
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN,
  JWT_PASSWORD_RESET_SECRET: process.env.JWT_PASSWORD_RESET_SECRET,
  LOG_LEVEL: process.env.LOG_LEVEL?.toUpperCase() || (NODE_ENV === 'production' ? 'INFO' : 'DEBUG'),
  FRONT_URL: process.env.FRONT_URL,
  RESEND_API_KEY: process.env.RESEND_API_KEY,
  EMAIL_PASS: process.env.EMAIL_PASS,
  EMAIL_USER: process.env.EMAIL_USER
};
