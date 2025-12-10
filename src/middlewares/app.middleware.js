import express from 'express';
import cors from 'cors';
import { requestLogger } from './logger.middleware.js';
import env from '../config/env.js';
import logger from '../utils/logger.js';

const setupMiddleware = (app) => {
  const allowedOrigins = [
    'http://localhost:3000',
    'http://localhost:4000',
    'http://localhost:3001'
  ];

  if (env.DEPLOYED_URL) {
    const deployedUrl = env.DEPLOYED_URL.startsWith('http')
      ? env.DEPLOYED_URL
      : `https://${env.DEPLOYED_URL}`;
    allowedOrigins.push(deployedUrl);
  }

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
  app.use(express.urlencoded({ extended: true }));
  app.use(requestLogger);
};

export default setupMiddleware;
