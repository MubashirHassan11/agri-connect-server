import express from 'express';
import logger from './utils/logger.js';
import setupMiddleware from './middlewares/app.middleware.js';
import setupRoutes from './routes/index.js';
import env from './config/env.js';

const app = express();

setupMiddleware(app);

setupRoutes(app);
if (env.NODE_ENV === 'development') {
  const { setupSwagger } = await import('./config/swagger.setup.js');
  setupSwagger(app);
}

app.use((err, req, res, next) => {
  const status = err.status || 500;
  logger.error('Request error', {
    message: err.message,
    name: err.name,
    status,
    stack: err.stack
  });

  res.status(status).json({
    success: false,
    message: err.message || 'Internal server error'
  });
});

export default app;
