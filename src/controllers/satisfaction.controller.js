import * as satisfactionService from '../services/satisfaction.service.js';
import {sendSuccess, sendError} from '../utils/response.js';

/**
 * Create a satisfaction review
 */
export const createSatisfaction = async (req, res) => {
  try {
    const reviewerId = req.user?.userId || req.user?.id;
    const satisfaction = await satisfactionService.createSatisfaction(req.body, reviewerId);
    return sendSuccess(res, satisfaction, 'Satisfaction review submitted successfully', 201);
  } catch (error) {
    return sendError(res, error.message, error.status || 400);
  }
};

/**
 * Get user's satisfaction reviews (as reviewer)
 */
export const getUserSatisfactionReviews = async (req, res) => {
  try {
    const userId = req.user?.userId || req.user?.id;
    const reviews = await satisfactionService.getUserSatisfactionReviews(userId);
    return sendSuccess(res, reviews, 'Satisfaction reviews fetched successfully');
  } catch (error) {
    return sendError(res, error.message, error.status || 500);
  }
};

/**
 * Get satisfaction reviews received by user
 */
export const getReceivedSatisfactionReviews = async (req, res) => {
  try {
    const userId = req.user?.userId || req.user?.id;
    const reviews = await satisfactionService.getReceivedSatisfactionReviews(userId);
    return sendSuccess(res, reviews, 'Received satisfaction reviews fetched successfully');
  } catch (error) {
    return sendError(res, error.message, error.status || 500);
  }
};

/**
 * Get all satisfaction reviews (admin)
 */
export const getAllSatisfactionReviews = async (req, res) => {
  try {
    const {role, search} = req.query;
    const reviews = await satisfactionService.getAllSatisfactionReviews({role, search});
    return sendSuccess(res, reviews, 'Satisfaction reviews fetched successfully');
  } catch (error) {
    return sendError(res, error.message, error.status || 500);
  }
};

/**
 * Get satisfaction review by ID
 */
export const getSatisfactionById = async (req, res) => {
  try {
    const {id} = req.params;
    const review = await satisfactionService.getSatisfactionById(id);
    return sendSuccess(res, review, 'Satisfaction review fetched successfully');
  } catch (error) {
    return sendError(res, error.message, error.status || 404);
  }
};

/**
 * Get satisfaction reviews for a specific order
 */
export const getOrderSatisfactionReviews = async (req, res) => {
  try {
    const {orderId} = req.params;
    
    if (!orderId) {
      return sendError(res, 'Order ID is required', 400);
    }

    // Validate that orderId is a valid MongoDB ObjectId format
    if (!/^[0-9a-fA-F]{24}$/.test(orderId)) {
      return sendError(res, 'Invalid order ID format', 400);
    }

    const reviews = await satisfactionService.getOrderSatisfactionReviews(orderId);
    return sendSuccess(res, reviews, 'Order satisfaction reviews fetched successfully');
  } catch (error) {
    return sendError(res, error.message, error.status || 500);
  }
};

/**
 * Get satisfaction reviews for a specific product
 */
export const getProductSatisfactionReviews = async (req, res) => {
  try {
    const {productId} = req.params;
    
    if (!productId) {
      return sendError(res, 'Product ID is required', 400);
    }

    const reviews = await satisfactionService.getProductSatisfactionReviews(productId);
    return sendSuccess(res, reviews, 'Product satisfaction reviews fetched successfully');
  } catch (error) {
    return sendError(res, error.message, error.status || 500);
  }
};




