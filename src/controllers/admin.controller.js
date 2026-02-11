import * as adminService from '../services/admin.service.js';
import {sendSuccess, sendError} from '../utils/response.js';

/**
 * Get admin dashboard statistics
 */
export const getDashboardStats = async (req, res) => {
  try {
    const stats = await adminService.getDashboardStats();
    return sendSuccess(res, stats, 'Dashboard stats fetched successfully');
  } catch (error) {
    return sendError(res, error.message, error.status || 500);
  }
};

/**
 * Get all signup requests
 */
export const getSignupRequests = async (req, res) => {
  try {
    const {status, userType} = req.query;
    const requests = await adminService.getSignupRequests({status, userType});
    return sendSuccess(res, requests, 'Signup requests fetched successfully');
  } catch (error) {
    return sendError(res, error.message, error.status || 500);
  }
};

/**
 * Approve a signup request
 */
export const approveSignupRequest = async (req, res) => {
  try {
    const {id} = req.params;
    const result = await adminService.approveSignupRequest(id);
    return sendSuccess(res, result, 'Signup request approved successfully');
  } catch (error) {
    return sendError(res, error.message, error.status || 400);
  }
};

/**
 * Reject a signup request
 */
export const rejectSignupRequest = async (req, res) => {
  try {
    const {id} = req.params;
    const result = await adminService.rejectSignupRequest(id);
    return sendSuccess(res, result, 'Signup request rejected successfully');
  } catch (error) {
    return sendError(res, error.message, error.status || 400);
  }
};

/**
 * Get all users (for admin management)
 */
export const getAllUsers = async (req, res) => {
  try {
    const {userType, status, search} = req.query;
    const users = await adminService.getAllUsers({userType, status, search});
    return sendSuccess(res, users, 'Users fetched successfully');
  } catch (error) {
    return sendError(res, error.message, error.status || 500);
  }
};

/**
 * Block a user
 */
export const blockUser = async (req, res) => {
  try {
    const {id} = req.params;
    const result = await adminService.blockUser(id);
    return sendSuccess(res, result, 'User blocked successfully');
  } catch (error) {
    return sendError(res, error.message, error.status || 400);
  }
};

/**
 * Unblock a user
 */
export const unblockUser = async (req, res) => {
  try {
    const {id} = req.params;
    const result = await adminService.unblockUser(id);
    return sendSuccess(res, result, 'User unblocked successfully');
  } catch (error) {
    return sendError(res, error.message, error.status || 400);
  }
};

/**
 * Get recent revenue from delivered orders
 */
export const getRecentRevenue = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const revenue = await adminService.getRecentRevenue(limit);
    return sendSuccess(res, revenue, 'Recent revenue fetched successfully');
  } catch (error) {
    return sendError(res, error.message, error.status || 500);
  }
};




/**
 * Get all orders/shipments pending payment approval
 */
export const getPendingPayments = async (req, res) => {
  try {
    const list = await adminService.getPendingPayments();
    return sendSuccess(res, list, 'Pending payments fetched successfully');
  } catch (error) {
    return sendError(res, error.message, error.status || 500);
  }
};

/**
 * Approve a primary payment
 */
export const approveOrderPayment = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await adminService.approveOrderPayment(id);
    return sendSuccess(res, result, 'Order payment approved successfully');
  } catch (error) {
    return sendError(res, error.message, error.status || 400);
  }
};

/**
 * Approve a logistics payment
 */
export const approveLogisticsPayment = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await adminService.approveLogisticsPayment(id);
    return sendSuccess(res, result, 'Logistics payment approved successfully');
  } catch (error) {
    return sendError(res, error.message, error.status || 400);
  }
};

/**
 * Reject a logistics payment
 */
export const rejectLogisticsPayment = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await adminService.rejectLogisticsPayment(id);
    return sendSuccess(res, result, 'Logistics payment rejected successfully');
  } catch (error) {
    return sendError(res, error.message, error.status || 400);
  }
};

/**
 * Reject an order
 */
export const rejectOrder = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await adminService.rejectOrder(id);
    return sendSuccess(res, result, 'Order rejected successfully');
  } catch (error) {
    return sendError(res, error.message, error.status || 400);
  }
};

/**
 * Get platform (admin) payment details
 */
export const getPlatformPaymentDetails = async (req, res) => {
  try {
    const details = await adminService.getPlatformPaymentDetails();
    return sendSuccess(res, details, 'Platform payment details fetched successfully');
  } catch (error) {
    return sendError(res, error.message, error.status || 500);
  }
};
