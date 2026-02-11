import express from 'express';
import * as satisfactionController from '../controllers/satisfaction.controller.js';

const router = express.Router();

// Create satisfaction review
router.post('/', satisfactionController.createSatisfaction);

// Get user's satisfaction reviews (as reviewer)
router.get('/my-reviews', satisfactionController.getUserSatisfactionReviews);

// Get received satisfaction reviews
router.get('/received', satisfactionController.getReceivedSatisfactionReviews);

// Get all satisfaction reviews (admin)
router.get('/all', satisfactionController.getAllSatisfactionReviews);

// Get satisfaction reviews for a specific order (must be before /:id route)
router.get('/order/:orderId', satisfactionController.getOrderSatisfactionReviews);

// Get satisfaction reviews for a specific product (must be before /:id route)
router.get('/product/:productId', satisfactionController.getProductSatisfactionReviews);

// Get satisfaction review by ID (must be last to avoid conflicts)
router.get('/:id', satisfactionController.getSatisfactionById);

export default router;




