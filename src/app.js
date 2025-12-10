import express from 'express';
import logger from './utils/logger.js';
import setupMiddleware from './middlewares/app.middleware.js';
import setupRoutes from './routes/index.js';

const app = express();

setupMiddleware(app);

setupRoutes(app);

app.use((err, _, res) => {
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
