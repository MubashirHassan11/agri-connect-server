import Order from '../models/Order.js';
import Product from '../models/Product.js';
import User from '../models/User.js';
import Shipment from '../models/Shipment.js';
import {NotFoundError, BadRequestError} from '../utils/errors.js';
import * as fileService from './file.service.js';

export const createOrder = async (orderData, buyerId) => {
  const data = {...orderData};
  const {productId, quantity, notes} = data;

  // Process payment screenshot if it's base64 (consistent with User profile pic logic)
  if (data.paymentScreenshot && typeof data.paymentScreenshot === 'string' && data.paymentScreenshot.startsWith('data:image')) {
    const file = await fileService.saveBase64Image(data.paymentScreenshot, {
      createdBy: buyerId,
      purpose: 'payment',
    });
    data.paymentScreenshot = file._id;
  }

  const product = await Product.findById(productId).populate('farmer');
  if (!product) {
    throw new NotFoundError('Product not found');
  }

  if (product.quantity < quantity) {
    throw new BadRequestError('Insufficient quantity');
  }

  if (product.farmer._id.toString() === buyerId) {
    throw new BadRequestError('Cannot order your own product');
  }

  const totalAmount = product.price * quantity;
  const PLATFORM_FEE_RATE = 0.03;
  const platformFeeBuyer = totalAmount * PLATFORM_FEE_RATE;
  const platformFeeSeller = totalAmount * PLATFORM_FEE_RATE;
  const netAmountSeller = totalAmount - platformFeeSeller;

  const order = await Order.create({
    buyer: buyerId,
    seller: product.farmer._id,
    product: productId,
    quantity,
    price: product.price,
    totalAmount,
    platformFeeBuyer,
    platformFeeSeller,
    netAmountSeller,
    status: 'pending_payment_approval',
    notes: notes || '',
    paymentScreenshot: data.paymentScreenshot
  });

  const populatedOrder = await Order.findById(order._id)
    .populate('buyer', 'name email entityName')
    .populate('seller', 'name email entityName paymentDetails')
    .populate('product', 'name category unit image')
    .populate('paymentScreenshot', 'filename _id');

  return populatedOrder;
};

export const getBuyerOrders = async (buyerId, filters = {}) => {
  const {status} = filters;
  const query = {buyer: buyerId};
  
  if (status && status !== 'all') {
    query.status = status;
  }

  const orders = await Order.find(query)
    .populate('seller', 'name email entityName entityAddress paymentDetails')
    .populate('product', 'name category unit image')
    .populate('paymentScreenshot', 'filename _id')
    .sort({createdAt: -1});

  const ordersWithShipments = await Promise.all(
    orders.map(async (order) => {
      const shipment = await Shipment.findOne({ order: order._id })
        .select('_id status logisticsPartner vehicle')
        .populate('logisticsPartner', 'name entityName')
        .populate('vehicle', 'vehicleName vehicleNumber');
      
      const orderObj = order.toObject();
      if (shipment) {
        orderObj.shipment = {
          _id: shipment._id,
          status: shipment.status,
          logisticsPartner: shipment.logisticsPartner,
          vehicle: shipment.vehicle
        };
      } else {
        orderObj.shipment = null;
      }
      
      return orderObj;
    })
  );

  return ordersWithShipments;
};

export const getSellerOrders = async (sellerId, filters = {}) => {
  const {status} = filters;
  const query = {seller: sellerId};
  
  if (status && status !== 'all') {
    query.status = status;
  }

  const orders = await Order.find(query)
    .populate('buyer', 'name email entityName entityAddress')
    .populate('product', 'name category unit image')
    .sort({createdAt: -1});

  return orders;
};

export const getAllOrders = async (filters = {}) => {
  const {status, search} = filters;
  const query = {};
  
  if (status && status !== 'all') {
    query.status = status;
  }

  let orders = await Order.find(query)
    .populate('buyer', 'name email entityName')
    .populate('seller', 'name email entityName paymentDetails')
    .populate('product', 'name category')
    .populate('paymentScreenshot', 'filename _id')
    .sort({createdAt: -1});

  const ordersWithFees = await Promise.all(
    orders.map(async (order) => {
      const shipment = await Shipment.findOne({ order: order._id })
        .select('platformFeeLogistics paymentScreenshot')
        .populate('paymentScreenshot', 'filename _id');
      const orderObj = order.toObject();
      orderObj.platformFeeLogistics = shipment ? shipment.platformFeeLogistics : 0;
      orderObj.logisticsPaymentScreenshot = shipment?.paymentScreenshot || null;
      return orderObj;
    })
  );

  if (search) {
    const searchLower = search.toLowerCase();
    const filteredOrders = ordersWithFees.filter(order => {
      const buyerName = order.buyer?.name?.toLowerCase() || '';
      const sellerName = order.seller?.name?.toLowerCase() || '';
      const productName = order.product?.name?.toLowerCase() || '';
      const orderId = order._id.toString().toLowerCase();
      return buyerName.includes(searchLower) || 
             sellerName.includes(searchLower) || 
             productName.includes(searchLower) ||
             orderId.includes(searchLower);
    });
    return filteredOrders;
  }

  return ordersWithFees;
};

export const acceptOrder = async (orderId, sellerId) => {
  const order = await Order.findById(orderId);
  if (!order) {
    throw new NotFoundError('Order not found');
  }

  if (order.seller.toString() !== sellerId) {
    throw new BadRequestError('Unauthorized');
  }

  if (order.status !== 'payment_approved') {
    throw new BadRequestError('Order cannot be accepted. Payment must be approved by admin first.');
  }

  const product = await Product.findById(order.product);
  if (!product) {
    throw new NotFoundError('Product not found');
  }

  if (product.quantity < order.quantity) {
    throw new BadRequestError('Insufficient quantity');
  }

  order.status = 'accepted';
  await order.save();

  product.quantity -= order.quantity;
  await product.save();

  const populatedOrder = await Order.findById(order._id)
    .populate('buyer', 'name email entityName')
    .populate('seller', 'name email entityName paymentDetails')
    .populate('product', 'name category unit image')
    .populate('paymentScreenshot', 'filename _id');

  return populatedOrder;
};

export const rejectOrder = async (orderId, sellerId) => {
  const order = await Order.findById(orderId);
  if (!order) {
    throw new NotFoundError('Order not found');
  }

  if (order.seller.toString() !== sellerId) {
    throw new BadRequestError('Unauthorized');
  }

  if (order.status !== 'pending_payment_approval' && order.status !== 'payment_approved') {
    throw new BadRequestError('Order cannot be rejected');
  }

  order.status = 'rejected';
  await order.save();

  const populatedOrder = await Order.findById(order._id)
    .populate('buyer', 'name email entityName')
    .populate('seller', 'name email entityName paymentDetails')
    .populate('product', 'name category unit image')
    .populate('paymentScreenshot', 'filename _id');

  return populatedOrder;
};

export const getOrderById = async (orderId) => {
  const order = await Order.findById(orderId)
    .populate('buyer', 'name email entityName entityAddress phoneNumber')
    .populate('seller', 'name email entityName entityAddress phoneNumber paymentDetails')
    .populate('product', 'name category unit image price quantity')
    .populate('paymentScreenshot', 'filename _id');
  
  if (!order) {
    throw new NotFoundError('Order not found');
  }
  
  return order;
};

export const markOrderAsDelivered = async (orderId, buyerId) => {
  const order = await Order.findById(orderId);
  if (!order) {
    throw new NotFoundError('Order not found');
  }

  if (order.buyer.toString() !== buyerId) {
    throw new BadRequestError('Unauthorized');
  }

  if (order.status !== 'shipped') {
    throw new BadRequestError('Order must be shipped before marking as delivered');
  }

  // Check if shipment exists and is delivered
  const shipment = await Shipment.findOne({ order: orderId });
  if (!shipment) {
    throw new BadRequestError('Shipment not found for this order');
  }

  if (shipment.status !== 'delivered') {
    throw new BadRequestError('Shipment must be delivered by logistics partner before marking order as delivered');
  }

  order.status = 'delivered';
  await order.save();

  const populatedOrder = await Order.findById(order._id)
    .populate('buyer', 'name email entityName')
    .populate('seller', 'name email entityName paymentDetails')
    .populate('product', 'name category unit image')
    .populate('paymentScreenshot', 'filename _id');

  return populatedOrder;
};



export const adminApprovePayment = async (orderId) => {
  const order = await Order.findById(orderId).populate('product');
  if (!order) {
    throw new NotFoundError('Order not found');
  }

  if (order.status !== 'pending_payment_approval') {
    throw new BadRequestError('Order is not pending payment approval');
  }

  const product = await Product.findById(order.product._id || order.product);
  if (!product) {
    throw new NotFoundError('Product not found');
  }

  if (product.quantity < order.quantity) {
    throw new BadRequestError('Insufficient quantity to accept order');
  }

  // Combined action: Mark as accepted and reduce inventory
  order.status = 'accepted';
  await order.save();

  product.quantity -= order.quantity;
  await product.save();

  return await getOrderById(order._id);
};

export const adminRejectOrder = async (orderId) => {
  const order = await Order.findById(orderId);
  if (!order) {
    throw new NotFoundError('Order not found');
  }

  if (order.status !== 'pending_payment_approval' && order.status !== 'payment_approved') {
    throw new BadRequestError('Order cannot be rejected');
  }

  order.status = 'rejected';
  await order.save();

  return await getOrderById(order._id);
};

