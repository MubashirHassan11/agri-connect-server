import swaggerUi from 'swagger-ui-express';
import swaggerSpec from './swagger.js';
import logger from '../utils/logger.js';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

export const setupSwagger = (app) => {
  try {
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);

    const _rootPath = path.resolve(__dirname, '../..');

    const __swaggerDistPath = path.join(_rootPath, 'node_modules', 'swagger-ui-dist');

    const swaggerOptions = {
      customCss: '.swagger-ui .topbar { display: none }',
      customSiteTitle: 'AgriConnect API Documentation'
    };

    app.use(
      '/api/docs',
      express.static(__swaggerDistPath, { index: false }),
      swaggerUi.serve,
      swaggerUi.setup(swaggerSpec, swaggerOptions)
    );

    logger.info('Swagger UI available at /api/docs');
  } catch (error) {
    logger.error('Failed to setup Swagger UI', {
      message: error.message,
      stack: error.stack
    });
  }
};
