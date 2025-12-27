import swaggerJsdoc from 'swagger-jsdoc';

const servers = [
  {
    url: 'http://localhost:3000',
    description: 'Development server'
  }
];

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
