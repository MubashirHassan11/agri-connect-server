import express from 'express';
import * as orderController from '../controllers/order.controller.js';
import { authenticate } from '../middlewares/auth.middleware.js';
import { authorize } from '../middlewares/authorize.middleware.js';

const router = express.Router();

// Create order
router.post('/', orderController.createOrder);

// Get buyer orders
router.get('/buyer', orderController.getBuyerOrders);

// Get seller orders
router.get('/seller', orderController.getSellerOrders);

// Get all orders (admin)
router.get('/all', orderController.getAllOrders);

// Get order by ID
router.get('/:id', orderController.getOrderById);

// Accept order
router.post('/:id/accept', orderController.acceptOrder);

// Reject order
router.post('/:id/reject', orderController.rejectOrder);

// Mark order as delivered (buyer only)
router.post(
  '/:id/delivered',
  authenticate,
  authorize(['buyer']),
  orderController.markOrderAsDelivered
);

export default router;




