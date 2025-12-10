import logger from '../utils/logger.js';

export const requestLogger = (req, res, next) => {
  const startTime = Date.now();
  const { method, originalUrl } = req;

  logger.info(`${method} ${originalUrl}`);
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    const { statusCode } = res;

    logger.info(`${method} ${originalUrl} - ${statusCode} - ${duration}ms`);
  });

  next();
};
