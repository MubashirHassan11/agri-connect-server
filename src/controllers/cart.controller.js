import * as cartService from '../services/cart.service.js';
import {sendSuccess, sendError} from '../utils/response.js';

export const getCart = async (req, res) => {
  try {
    const buyerId = req.user?.userId || req.user?.id;
    const cart = await cartService.getCart(buyerId);
    return sendSuccess(res, cart, 'Cart fetched successfully');
  } catch (error) {
    return sendError(res, error.message, error.status || 500);
  }
};

export const addOrUpdateItem = async (req, res) => {
  try {
    const buyerId = req.user?.userId || req.user?.id;
    const cart = await cartService.addOrUpdateItem(buyerId, req.body);
    return sendSuccess(res, cart, 'Cart updated successfully');
  } catch (error) {
    return sendError(res, error.message, error.status || 400);
  }
};

export const removeItem = async (req, res) => {
  try {
    const buyerId = req.user?.userId || req.user?.id;
    const {productId} = req.params;
    const cart = await cartService.removeItem(buyerId, productId);
    return sendSuccess(res, cart, 'Item removed from cart');
  } catch (error) {
    return sendError(res, error.message, error.status || 400);
  }
};

export const checkout = async (req, res) => {
  try {
    const buyerId = req.user?.userId || req.user?.id;
    const { paymentScreenshot } = req.body;
    const orders = await cartService.checkout(buyerId, paymentScreenshot);
    return sendSuccess(res, orders, 'Checkout successful');
  } catch (error) {
    return sendError(res, error.message, error.status || 400);
  }
};





