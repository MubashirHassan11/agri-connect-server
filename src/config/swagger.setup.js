import swaggerUi from 'swagger-ui-express';
import swaggerSpec from './swagger.js';
import logger from '../utils/logger.js';

export const setupSwagger = (app) => {
  try {
    app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
    logger.info('Swagger UI available at /api/docs');
  } catch (error) {
    logger.error('Failed to setup Swagger UI', {
      message: error.message,
      stack: error.stack
    });
  }
};
