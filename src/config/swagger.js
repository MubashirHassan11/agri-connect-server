import swaggerJsdoc from 'swagger-jsdoc';
import env from './env.js';

const servers = [
  {
    url: 'http://localhost:3000',
    description: 'Development server'
  }
];

if (env.DEPLOYED_URL) {
  const deployedUrl = env.DEPLOYED_URL.startsWith('http')
    ? env.DEPLOYED_URL
    : `https://${env.DEPLOYED_URL}`;

  servers.push({
    url: deployedUrl,
    description: 'Production server'
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
