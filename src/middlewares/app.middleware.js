import express from 'express';
import cors from 'cors';
import {requestLogger} from './logger.middleware.js';
import {authenticate} from './auth.middleware.js';
import logger from '../utils/logger.js';

const setupMiddleware = (app) => {
  logger.info('Setting up middleware...');
  const allowedOrigins = [
    'http://localhost:3000',
    'http://localhost:4000',
    'http://localhost:3001'
  ];

  app.use(
    cors({
      origin: (origin, callback) => {
        if (!origin) return callback(null, true);

        if (allowedOrigins.includes(origin)) {
          callback(null, true);
        } else {
          callback(new Error('Not allowed by CORS'));
        }
      },
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
      credentials: true
    })
  );

  app.use(express.json());
  app.use(express.urlencoded({extended: true}));
  app.use(requestLogger);
  app.use(authenticate);
  logger.info('Middleware setup complete');
};

export default setupMiddleware;
