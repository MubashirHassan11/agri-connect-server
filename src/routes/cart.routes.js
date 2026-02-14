import express from 'express';
import * as cartController from '../controllers/cart.controller.js';

const router = express.Router();

// Get current buyer cart
router.get('/', cartController.getCart);

// Add or update cart item
router.post('/items', cartController.addOrUpdateItem);

// Remove item from cart
router.delete('/items/:productId', cartController.removeItem);

// Estimate delivery fee
router.get('/estimate-delivery', cartController.estimateDeliveryFee);

// Checkout
router.post('/checkout', cartController.checkout);

export default router;





