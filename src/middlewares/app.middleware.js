import express from 'express';
import cors from 'cors';
import { requestLogger } from './logger.middleware.js';

const setupMiddleware = (app) => {
  app.use(cors());
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  app.use(requestLogger);
};

export default setupMiddleware;

