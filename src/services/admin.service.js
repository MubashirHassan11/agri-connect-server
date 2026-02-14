import User from '../models/User.js';
import Product from '../models/Product.js';
import Order from '../models/Order.js';
import Shipment from '../models/Shipment.js';
import {NotFoundError, BadRequestError} from '../utils/errors.js';
import {USER_TYPES} from '../constants/userTypes.js';
import * as orderService from './order.service.js';
import * as userService from './user.service.js';
import * as fileService from './file.service.js';

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
  shipment.adminLogisticsPaymentStatus = 'pending'; // Admin now needs to pay the logistics partner
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
    status: { $nin: ['inactive', 'cancelled'] },
    paymentStatus: { $in: ['pending'] } 
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

/**
 * Get pending outgoing payments (admin needs to pay sellers and logistics)
 */
export const getPendingOutgoingPayments = async () => {
  // Find orders where payment is approved but admin hasn't paid seller yet
  // Match both documents with sellerPaymentStatus='pending' and documents without the field (legacy)
  const sellerPayments = await Order.find({ 
    status: { $in: ['accepted', 'shipped', 'delivered'] },
    $or: [
      { sellerPaymentStatus: 'pending' },
      { sellerPaymentStatus: { $exists: false } }
    ]
  })
    .populate('buyer', 'name entityName')
    .populate('seller', 'name entityName phoneNumber paymentDetails')
    .populate('product', 'name')
    .sort({ updatedAt: -1 });

  // Find shipments where logistics payment is approved but admin hasn't paid logistics yet
  // Match both documents with adminLogisticsPaymentStatus='pending' and documents without the field (legacy)
  const logisticsPayments = await Shipment.find({ 
    paymentStatus: 'approved',
    $or: [
      { adminLogisticsPaymentStatus: 'pending' },
      { adminLogisticsPaymentStatus: { $exists: false } }
    ]
  })
    .populate('buyer', 'name entityName')
    .populate('seller', 'name entityName')
    .populate('logisticsPartner', 'name entityName phoneNumber paymentDetails')
    .populate({
      path: 'order',
      populate: { path: 'product', select: 'name' }
    })
    .sort({ updatedAt: -1 });

  // Format seller payments
  const formattedSellerPayments = sellerPayments.map(order => {
    const plain = order.toObject();
    return {
      ...plain,
      _id: plain._id.toString(), // Ensure _id is a string
      type: 'seller',
      recipient: plain.seller,
      amount: plain.netAmountSeller,
      orderId: plain._id.toString() // Ensure orderId is a string
    };
  });

  // Format logistics payments
  const formattedLogisticsPayments = logisticsPayments.map(shipment => {
    const plain = shipment.toObject();
    return {
      ...plain,
      _id: plain._id.toString(), // Ensure _id is a string
      type: 'logistics',
      recipient: plain.logisticsPartner,
      amount: plain.netAmountLogistics,
      orderId: plain.order._id ? plain.order._id.toString() : undefined, // Ensure orderId is a string
      shipmentId: plain._id.toString(), // Ensure shipmentId is a string
      product: plain.order.product
    };
  });

  // Combine and sort
  const combined = [...formattedSellerPayments, ...formattedLogisticsPayments];
  return combined.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
};

/**
 * Mark seller payment as paid
 */
export const markSellerPaymentPaid = async (orderId, paymentScreenshot, adminId) => {
  const order = await Order.findById(orderId);
  if (!order) {
    throw new NotFoundError('Order not found');
  }

  if (order.sellerPaymentStatus === 'paid') {
    throw new BadRequestError('Payment already marked as paid');
  }

  // Handle base64 image
  let screenshotId = paymentScreenshot;
  if (paymentScreenshot && typeof paymentScreenshot === 'string' && paymentScreenshot.startsWith('data:image')) {
    const file = await fileService.saveBase64Image(paymentScreenshot, {
      createdBy: adminId,
      purpose: 'payment',
    });
    screenshotId = file._id;
  }

  order.sellerPaymentStatus = 'paid';
  order.sellerPaymentScreenshot = screenshotId;
  order.sellerPaidAt = new Date();
  await order.save();

  return await Order.findById(orderId)
    .populate('seller', 'name entityName')
    .populate('product', 'name');
};

/**
 * Mark logistics payment as paid
 */
export const markLogisticsPaymentPaid = async (shipmentId, paymentScreenshot, adminId) => {
  const shipment = await Shipment.findById(shipmentId);
  if (!shipment) {
    throw new NotFoundError('Shipment not found');
  }

  if (shipment.adminLogisticsPaymentStatus === 'paid') {
    throw new BadRequestError('Payment already marked as paid');
  }

  // Handle base64 image
  let screenshotId = paymentScreenshot;
  if (paymentScreenshot && typeof paymentScreenshot === 'string' && paymentScreenshot.startsWith('data:image')) {
    const file = await fileService.saveBase64Image(paymentScreenshot, {
      createdBy: adminId,
      purpose: 'payment',
    });
    screenshotId = file._id;
  }

  shipment.adminLogisticsPaymentStatus = 'paid';
  shipment.adminLogisticsPaymentScreenshot = screenshotId;
  shipment.adminLogisticsPaidAt = new Date();
  await shipment.save();

  return await Shipment.findById(shipmentId)
    .populate('logisticsPartner', 'name entityName')
    .populate({
      path: 'order',
      populate: { path: 'product', select: 'name' }
    });
};

/**
 * Get all transactions (incoming deposits + outgoing payments) for ledger view
 */
export const getAllTransactions = async () => {
  // 1. Incoming deposits from buyers (orders where buyer has paid)
  const paidOrders = await Order.find({
    status: { $in: ['accepted', 'shipped', 'delivered', 'pending_payment_approval'] },
    paymentScreenshot: { $exists: true, $ne: null }
  })
    .populate('buyer', 'name entityName')
    .populate('seller', 'name entityName')
    .populate('product', 'name')
    .populate('paymentScreenshot', 'filename _id')
    .populate('sellerPaymentScreenshot', 'filename _id')
    .sort({ createdAt: -1 });

  // 2. Logistics payments from buyers
  const paidShipments = await Shipment.find({
    paymentStatus: { $in: ['pending', 'approved'] },
    paymentScreenshot: { $exists: true, $ne: null }
  })
    .populate('buyer', 'name entityName')
    .populate('seller', 'name entityName')
    .populate('logisticsPartner', 'name entityName')
    .populate('paymentScreenshot', 'filename _id')
    .populate('adminLogisticsPaymentScreenshot', 'filename _id')
    .populate({
      path: 'order',
      populate: { path: 'product', select: 'name' }
    })
    .sort({ createdAt: -1 });

  const transactions = [];

  // Map incoming order payments (buyer -> admin)
  for (const order of paidOrders) {
    const o = order.toObject();

    // Incoming: buyer paid for order
    transactions.push({
      _id: `in-order-${o._id}`,
      date: o.createdAt,
      type: 'deposit',
      direction: 'incoming',
      description: `Order payment from buyer`,
      from: o.buyer?.entityName || o.buyer?.name || 'Buyer',
      to: 'Platform',
      product: o.product?.name || 'Product Deleted',
      totalAmount: o.totalAmount + (o.platformFeeBuyer || 0),
      platformFee: (o.platformFeeBuyer || 0) + (o.platformFeeSeller || 0),
      netAmount: o.totalAmount + (o.platformFeeBuyer || 0),
      status: o.status === 'pending_payment_approval' ? 'pending_verification' : 'received',
      screenshot: o.paymentScreenshot,
      orderId: o._id.toString(),
    });

    // Outgoing: admin paid seller
    if (o.sellerPaymentStatus === 'paid') {
      transactions.push({
        _id: `out-seller-${o._id}`,
        date: o.sellerPaidAt || o.updatedAt,
        type: 'credit',
        direction: 'outgoing',
        description: `Payment to seller`,
        from: 'Platform',
        to: o.seller?.entityName || o.seller?.name || 'Seller',
        product: o.product?.name || 'Product Deleted',
        totalAmount: o.netAmountSeller,
        platformFee: o.platformFeeSeller || 0,
        netAmount: o.netAmountSeller,
        status: 'paid',
        screenshot: o.sellerPaymentScreenshot,
        orderId: o._id.toString(),
      });
    }
  }

  // Map incoming logistics payments (buyer -> admin)
  for (const shipment of paidShipments) {
    const s = shipment.toObject();

    // Incoming: buyer paid for logistics
    transactions.push({
      _id: `in-logistics-${s._id}`,
      date: s.createdAt,
      type: 'deposit',
      direction: 'incoming',
      description: `Logistics payment from buyer`,
      from: s.buyer?.entityName || s.buyer?.name || 'Buyer',
      to: 'Platform',
      product: s.order?.product?.name || 'Shipment',
      totalAmount: s.totalFare,
      platformFee: s.platformFeeLogistics || 0,
      netAmount: s.totalFare,
      status: s.paymentStatus === 'approved' ? 'received' : 'pending_verification',
      screenshot: s.paymentScreenshot,
      orderId: s.order?._id?.toString(),
      shipmentId: s._id.toString(),
    });

    // Outgoing: admin paid logistics partner
    if (s.adminLogisticsPaymentStatus === 'paid') {
      transactions.push({
        _id: `out-logistics-${s._id}`,
        date: s.adminLogisticsPaidAt || s.updatedAt,
        type: 'credit',
        direction: 'outgoing',
        description: `Payment to logistics partner`,
        from: 'Platform',
        to: s.logisticsPartner?.entityName || s.logisticsPartner?.name || 'Logistics',
        product: s.order?.product?.name || 'Shipment',
        totalAmount: s.netAmountLogistics,
        platformFee: s.platformFeeLogistics || 0,
        netAmount: s.netAmountLogistics,
        status: 'paid',
        screenshot: s.adminLogisticsPaymentScreenshot,
        orderId: s.order?._id?.toString(),
        shipmentId: s._id.toString(),
      });
    }
  }

  // Sort all transactions by date descending
  transactions.sort((a, b) => new Date(b.date) - new Date(a.date));

  return transactions;
};
