import * as orderService from '../services/order.service.js';
import {sendSuccess, sendError} from '../utils/response.js';

/**
 * Create a new order
 */
export const createOrder = async (req, res) => {
  try {
    const buyerId = req.user?.userId || req.user?.id;
    const order = await orderService.createOrder(req.body, buyerId);
    return sendSuccess(res, order, 'Order created successfully', 201);
  } catch (error) {
    return sendError(res, error.message, error.status || 400);
  }
};

/**
 * Get buyer orders
 */
export const getBuyerOrders = async (req, res) => {
  try {
    const buyerId = req.user?.userId || req.user?.id;
    const {status} = req.query;
    const orders = await orderService.getBuyerOrders(buyerId, {status});
    return sendSuccess(res, orders, 'Orders fetched successfully');
  } catch (error) {
    return sendError(res, error.message, error.status || 500);
  }
};

/**
 * Get seller orders
 */
export const getSellerOrders = async (req, res) => {
  try {
    const sellerId = req.user?.userId || req.user?.id;
    const {status} = req.query;
    const orders = await orderService.getSellerOrders(sellerId, {status});
    return sendSuccess(res, orders, 'Orders fetched successfully');
  } catch (error) {
    return sendError(res, error.message, error.status || 500);
  }
};

/**
 * Get all orders (admin)
 */
export const getAllOrders = async (req, res) => {
  try {
    const {status, search} = req.query;
    const orders = await orderService.getAllOrders({status, search});
    return sendSuccess(res, orders, 'Orders fetched successfully');
  } catch (error) {
    return sendError(res, error.message, error.status || 500);
  }
};

/**
 * Accept an order
 */
export const acceptOrder = async (req, res) => {
  try {
    const {id} = req.params;
    const sellerId = req.user?.userId || req.user?.id;
    const order = await orderService.acceptOrder(id, sellerId);
    return sendSuccess(res, order, 'Order accepted successfully');
  } catch (error) {
    return sendError(res, error.message, error.status || 400);
  }
};

/**
 * Reject an order
 */
export const rejectOrder = async (req, res) => {
  try {
    const {id} = req.params;
    const sellerId = req.user?.userId || req.user?.id;
    const order = await orderService.rejectOrder(id, sellerId);
    return sendSuccess(res, order, 'Order rejected successfully');
  } catch (error) {
    return sendError(res, error.message, error.status || 400);
  }
};

/**
 * Get order by ID
 */
export const getOrderById = async (req, res) => {
  try {
    const {id} = req.params;
    const order = await orderService.getOrderById(id);
    return sendSuccess(res, order, 'Order fetched successfully');
  } catch (error) {
    return sendError(res, error.message, error.status || 404);
  }
};

/**
 * Mark order as delivered (buyer only)
 */
export const markOrderAsDelivered = async (req, res) => {
  try {
    const {id} = req.params;
    const buyerId = req.user?.userId || req.user?.id;
    const order = await orderService.markOrderAsDelivered(id, buyerId);
    return sendSuccess(res, order, 'Order marked as delivered successfully');
  } catch (error) {
    return sendError(res, error.message, error.status || 400);
  }
};

/**
 * Buyer submits payment for an order (after seller accepts)
 */
export const submitPayment = async (req, res) => {
  try {
    const {id} = req.params;
    const buyerId = req.user?.userId || req.user?.id;
    const {paymentScreenshot} = req.body;
    const order = await orderService.submitPayment(id, buyerId, paymentScreenshot);
    return sendSuccess(res, order, 'Payment submitted successfully');
  } catch (error) {
    return sendError(res, error.message, error.status || 400);
  }
};

/**
 * Get seller payouts (money received from admin)
 */
export const getSellerPayouts = async (req, res) => {
  try {
    const sellerId = req.user?.userId || req.user?.id;
    const { status } = req.query;
    const payouts = await orderService.getSellerPayouts(sellerId, { status });
    return sendSuccess(res, payouts, 'Payouts fetched successfully');
  } catch (error) {
    return sendError(res, error.message, error.status || 500);
  }
};

