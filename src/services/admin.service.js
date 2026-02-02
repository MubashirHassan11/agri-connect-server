import User from '../models/User.js';
import Product from '../models/Product.js';
import Order from '../models/Order.js';
import Shipment from '../models/Shipment.js';
import {NotFoundError, BadRequestError} from '../utils/errors.js';
import {USER_TYPES} from '../constants/userTypes.js';
import * as orderService from './order.service.js';
import * as userService from './user.service.js';

/**
 * Get all signup requests (users with pending status)
 */
export const getSignupRequests = async (filters = {}) => {
  const {status, userType} = filters;

  // Base query: only non-admin user types (buyers, farmers, logistics)
  const query = {
    userType: {$in: [USER_TYPES.BUYER, USER_TYPES.FARMER, USER_TYPES.LOGISTICS]}
  };

  if (!status || status === 'pending') {
    query.status = 'pending';
  } else if (status !== 'all') {
    query.status = status;
  }

  const requests = await User.find(query)
    .select('-password')
    .sort({createdAt: -1});
  
  return requests;
};

/**
 * Approve a signup request
 */
export const approveSignupRequest = async (userId) => {
  const user = await User.findById(userId);
  if (!user) {
    throw new NotFoundError('User not found');
  }

  if (user.status === 'approved') {
    throw new BadRequestError('User is already approved');
  }

  user.status = 'approved';
  await user.save();

  return {
    id: user._id,
    name: user.name,
    email: user.email,
    userType: user.userType,
    status: user.status
  };
};

/**
 * Reject a signup request
 */
export const rejectSignupRequest = async (userId) => {
  const user = await User.findById(userId);
  if (!user) {
    throw new NotFoundError('User not found');
  }

  if (user.status === 'rejected') {
    throw new BadRequestError('User is already rejected');
  }

  user.status = 'rejected';
  await user.save();

  return {
    id: user._id,
    name: user.name,
    email: user.email,
    userType: user.userType,
    status: user.status
  };
};

/**
 * Get all users with filters
 */
export const getAllUsers = async (filters = {}) => {
  const {userType, status, search} = filters;
  
  const query = {};
  
  if (userType && userType !== 'all') {
    query.userType = userType;
  }
  
  if (status && status !== 'all') {
    if (status === 'active') {
      query.isBlocked = false;
    } else if (status === 'blocked') {
      query.isBlocked = true;
    }
  }

  if (search) {
    query.$or = [
      {name: {$regex: search, $options: 'i'}},
      {email: {$regex: search, $options: 'i'}},
      {entityName: {$regex: search, $options: 'i'}}
    ];
  }

  const users = await User.find(query)
    .select('-password')
    .sort({createdAt: -1});
  
  return users;
};

/**
 * Block a user
 */
export const blockUser = async (userId) => {
  const user = await User.findById(userId);
  if (!user) {
    throw new NotFoundError('User not found');
  }

  if (user.isBlocked) {
    throw new BadRequestError('User is already blocked');
  }

  user.isBlocked = true;
  await user.save();

  return {
    id: user._id,
    name: user.name,
    email: user.email,
    isBlocked: user.isBlocked
  };
};

/**
 * Unblock a user
 */
export const unblockUser = async (userId) => {
  const user = await User.findById(userId);
  if (!user) {
    throw new NotFoundError('User not found');
  }

  if (!user.isBlocked) {
    throw new BadRequestError('User is not blocked');
  }

  user.isBlocked = false;
  await user.save();

  return {
    id: user._id,
    name: user.name,
    email: user.email,
    isBlocked: user.isBlocked
  };
};

/**
 * Get admin dashboard statistics
 */
export const getDashboardStats = async () => {
  const totalUsers = await User.countDocuments();
  const totalFarmers = await User.countDocuments({userType: USER_TYPES.FARMER, status: 'approved'});
  const totalBuyers = await User.countDocuments({userType: USER_TYPES.BUYER, status: 'approved'});
  const blockedUsers = await User.countDocuments({isBlocked: true});
  const pendingRequests = await User.countDocuments({
    status: 'pending',
    userType: {
      $in: [USER_TYPES.BUYER, USER_TYPES.FARMER, USER_TYPES.LOGISTICS]
    }
  });
  const totalProducts = await Product.countDocuments();

  const completedOrders = await Order.countDocuments({ status: 'delivered' });
  
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const completedOrdersThisMonth = await Order.countDocuments({
    status: 'delivered',
    updatedAt: {$gte: thirtyDaysAgo}
  });

  const revenueFromOrders = await Order.aggregate([
    { $match: { status: 'delivered' } },
    {
      $group: {
        _id: null,
        total: {
          $sum: {
            $add: ['$platformFeeBuyer', '$platformFeeSeller']
          }
        }
      }
    }
  ]);

  const revenueFromShipments = await Shipment.aggregate([
    { $match: { status: 'delivered' } },
    {
      $group: {
        _id: null,
        total: { $sum: '$platformFeeLogistics' }
      }
    }
  ]);

  const totalRevenue = (revenueFromOrders[0]?.total || 0) + (revenueFromShipments[0]?.total || 0);

  const newUsersThisMonth = await User.countDocuments({
    createdAt: {$gte: thirtyDaysAgo}
  });

  const newProductsThisMonth = await Product.countDocuments({
    createdAt: {$gte: thirtyDaysAgo}
  });

  const newFarmersThisMonth = await User.countDocuments({
    userType: USER_TYPES.FARMER,
    status: 'approved',
    createdAt: {$gte: thirtyDaysAgo}
  });

  const newBuyersThisMonth = await User.countDocuments({
    userType: USER_TYPES.BUYER,
    status: 'approved',
    createdAt: {$gte: thirtyDaysAgo}
  });

  const blockedUsersThisMonth = await User.countDocuments({
    isBlocked: true,
    updatedAt: {$gte: thirtyDaysAgo}
  });

  return {
    totalRevenue,
    totalUsers,
    totalFarmers,
    totalBuyers,
    blockedUsers,
    pendingRequests,
    totalProducts,
    completedOrders,
    completedOrdersThisMonth,
    newUsersThisMonth,
    newProductsThisMonth,
    newFarmersThisMonth,
    newBuyersThisMonth,
    blockedUsersThisMonth
  };
};

/**
 * Get recent revenue from delivered orders
 */
export const getRecentRevenue = async (limit = 10) => {
  const recentOrders = await Order.find({ status: 'delivered' })
    .populate('buyer', 'name entityName')
    .populate('seller', 'name entityName')
    .sort({ updatedAt: -1 })
    .limit(limit);

  const revenueData = await Promise.all(
    recentOrders.map(async (order) => {
      const shipment = await Shipment.findOne({ order: order._id }).select('platformFeeLogistics');
      const logisticsFee = shipment ? shipment.platformFeeLogistics : 0;
      
      const totalCommission = (order.platformFeeBuyer || 0) + (order.platformFeeSeller || 0) + logisticsFee;
      const commissionPercentage = order.totalAmount > 0 
        ? ((totalCommission / order.totalAmount) * 100).toFixed(1)
        : '0.0';

      return {
        id: order._id.toString(),
        orderId: `#${order._id.toString().slice(-6).toUpperCase()}`,
        orderAmount: order.totalAmount || 0,
        commission: totalCommission,
        seller: order.seller?.entityName || order.seller?.name || 'Unknown Seller',
        buyer: order.buyer?.entityName || order.buyer?.name || 'Unknown Buyer',
        date: order.updatedAt || order.createdAt,
        percentage: `${commissionPercentage}%`,
      };
    })
  );

  return revenueData;
};

/**
 * Approve primary order payment
 */
export const approveOrderPayment = async (orderId) => {
  return await orderService.adminApprovePayment(orderId);
};

/**
 * Approve logistics payment
 */
export const approveLogisticsPayment = async (orderId) => {
  const shipment = await Shipment.findOne({ order: orderId });
  if (!shipment) {
    throw new NotFoundError('Shipment not found for this order');
  }

  shipment.paymentStatus = 'approved';
  await shipment.save();

  // Also update order status for tracking
  const order = await Order.findById(orderId);
  if (order) {
    order.logisticsPaymentStatus = 'approved';
    await order.save();
  }

  return await orderService.getOrderById(orderId);
};

/**
 * Reject logistics payment and cancel shipment
 */
export const rejectLogisticsPayment = async (orderId) => {
  const shipment = await Shipment.findOne({ order: orderId });
  if (!shipment) {
    throw new NotFoundError('Shipment not found for this order');
  }

  // Release vehicle
  if (shipment.vehicle) {
    const Vehicle = (await import('../models/Vehicle.js')).default;
    const vehicle = await Vehicle.findById(shipment.vehicle._id || shipment.vehicle);
    if (vehicle) {
      vehicle.isAvailable = true;
      await vehicle.save();
    }
  }

  shipment.paymentStatus = 'rejected';
  shipment.status = 'cancelled';
  await shipment.save();

  // Update order status for tracking
  const order = await Order.findById(orderId);
  if (order) {
    order.logisticsPaymentStatus = 'rejected';
    await order.save();
  }

  return await orderService.getOrderById(orderId);
};

/**
 * Reject an order (and primary payment)
 */
export const rejectOrder = async (orderId) => {
  // Reject order through order service
  const order = await orderService.adminRejectOrder(orderId);

  // If there's a related shipment, cancel it and release vehicle
  const shipment = await Shipment.findOne({ order: orderId });
  if (shipment) {
    if (shipment.vehicle) {
      const Vehicle = (await import('../models/Vehicle.js')).default;
      const vehicle = await Vehicle.findById(shipment.vehicle._id || shipment.vehicle);
      if (vehicle) {
        vehicle.isAvailable = true;
        await vehicle.save();
      }
    }
    shipment.status = 'cancelled';
    await shipment.save();
  }

  return order;
};

/**
 * Get orders and shipments pending payment approval
 */
export const getPendingPayments = async () => {
  const pendingOrders = await Order.find({ status: 'pending_payment_approval' })
    .populate('buyer', 'name entityName')
    .populate('seller', 'name entityName')
    .populate('product', 'name')
    .populate('paymentScreenshot', 'filename _id')
    .sort({ updatedAt: -1 });

  const pendingShipments = await Shipment.find({ 
    status: 'pending',
    paymentStatus: { $in: ['pending', 'none'] } 
  })
    .populate('buyer', 'name entityName')
    .populate('seller', 'name entityName')
    .populate({
      path: 'order',
      populate: { path: 'product', select: 'name' }
    })
    .populate('paymentScreenshot', 'filename _id')
    .sort({ updatedAt: -1 });

  // Map shipments to look like order records for the frontend
  const mappedShipments = pendingShipments.map(s => {
    const plain = s.toObject();
    return {
      ...plain,
      _id: s.order._id ? s.order._id.toString() : s.order.toString(), // Use order ID as primary ID for frontend compatibility
      shipmentId: s._id.toString(),
      isLogisticsPayment: true,
      status: 'payment_approved', // Hardcode to ensure product approval section is hidden
      logisticsPaymentStatus: s.paymentStatus,
      logisticsPaymentScreenshot: plain.paymentScreenshot,
      product: plain.order.product,
      totalAmount: plain.totalFare, // Use logistics fare as the amount
      updatedAt: plain.updatedAt
    };
  });

  // Combine and sort by date
  const combined = [...pendingOrders.map(o => o.toObject()), ...mappedShipments];
  return combined.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
};

/**
 * Get platform (admin) payment details
 */
export const getPlatformPaymentDetails = async () => {
  const admin = await User.findOne({ userType: USER_TYPES.ADMIN }).select('paymentDetails');
  if (!admin) {
    throw new NotFoundError('Platform administrator not found');
  }
  return admin.paymentDetails || {};
};
