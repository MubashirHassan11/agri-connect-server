import app from './app.js';
import connectDB from './config/db.js';
import env from './config/env.js';
import logger from './utils/logger.js';

(async () => {
  logger.info(`Starting server [${env.NODE_ENV}]...`);

  await connectDB();

  app.listen(env.PORT, () => {
    logger.info(`Server [${env.NODE_ENV}] is running on port ${env.PORT}`);
    logger.info(`API URL: http://localhost:${env.PORT}`);
  });
})();
