import swaggerJsdoc from 'swagger-jsdoc';
import env from './env.js';

const servers = [
  {
    url: 'http://localhost:3000',
    description: 'Development server'
  }
];

if (env.VERCEL_URL) {
  const vercelUrl = env.VERCEL_URL.startsWith('http')
    ? env.VERCEL_URL
    : `https://${env.VERCEL_URL}`;

  servers.push({
    url: vercelUrl,
    description: 'Production server (Vercel)'
  });
}

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'AgriConnect API',
      version: '1.0.0',
      description: 'AgriConnect API Documentation'
    },
    servers,
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT'
        }
      }
    }
  },
  apis: ['./src/routes/*.js']
};

export default swaggerJsdoc(options);
