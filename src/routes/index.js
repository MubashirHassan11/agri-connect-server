import authRoutes from './auth.routes.js';
import userRoutes from './user.routes.js';
import productRoutes from './product.routes.js';
// import {} from '../middlewares/auth.middleware.js';

const setupRoutes = (app) => {
  app.get('/', (req, res) => {
    res.json({
      success: true,
      message: 'AgriConnect API is running',
      version: '1.0.0',
      apiDocs: '/api/docs'
    });
  });

  app.use('/api/auth', authRoutes);
  app.use('/api/users', userRoutes);
  app.use('/api/products', productRoutes);
};

export default setupRoutes;
