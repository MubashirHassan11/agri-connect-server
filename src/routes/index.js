import authRoutes from './auth.routes.js';
import userRoutes from './user.routes.js';
import productRoutes from './product.routes.js';
import adminRoutes from './admin.routes.js';
import orderRoutes from './order.routes.js';
import satisfactionRoutes from './satisfaction.routes.js';
import cartRoutes from './cart.routes.js';
import fileRoutes from './file.routes.js';
import logisticsRoutes from './logistics.routes.js';
import vehicleRoutes from './vehicle.routes.js';
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
  app.use('/api/admin', adminRoutes);
  app.use('/api/orders', orderRoutes);
  app.use('/api/satisfaction', satisfactionRoutes);
  app.use('/api/cart', cartRoutes);
  app.use('/api/files', fileRoutes);
  app.use('/api/logistics', logisticsRoutes);
  app.use('/api/vehicles', vehicleRoutes);
};

export default setupRoutes;
