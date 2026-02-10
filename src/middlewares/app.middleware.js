import express from 'express';
import cors from 'cors';
import {requestLogger} from './logger.middleware.js';
import {authenticate} from './auth.middleware.js';
import logger from '../utils/logger.js';

const setupMiddleware = (app) => {
  logger.info('Setting up middleware...');
  // const allowedOrigins = [
  //   'http://localhost:3000',
  //   'http://localhost:4000',
  //   'http://localhost:3001'
  // ];

  app.use(
    cors({
      origin: '*',
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
    })
  );

  // Increase body size limit to handle base64 images (50MB limit)
  app.use(express.json({limit: '50mb'}));
  app.use(express.urlencoded({extended: true, limit: '50mb'}));
  app.use(requestLogger);
  app.use(authenticate);
  logger.info('Middleware setup complete');
};

export default setupMiddleware;
