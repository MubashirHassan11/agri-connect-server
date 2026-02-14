import Order from '../models/Order.js';
import Product from '../models/Product.js';
import User from '../models/User.js';
import Shipment from '../models/Shipment.js';
import Vehicle from '../models/Vehicle.js';
import {NotFoundError, BadRequestError} from '../utils/errors.js';
import * as fileService from './file.service.js';

/**
 * Haversine formula
 */
const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 100) / 100;
};

export const createOrder = async (orderData, buyerId) => {
  const data = {...orderData};
  const {productId, quantity, notes, deliveryEstimate} = data;

  const product = await Product.findById(productId).populate('farmer');
  if (!product) {
    throw new NotFoundError('Product not found');
  }

  if (product.minPurchase && quantity < product.minPurchase) {
    throw new BadRequestError(`Minimum purchase quantity is ${product.minPurchase} ${product.unit || 'kg'}`);
  }

  if (product.quantity < quantity) {
    throw new BadRequestError(`Only ${product.quantity} ${product.unit || 'kg'} available`);
  }

  if (product.farmer._id.toString() === buyerId) {
    throw new BadRequestError('Cannot order your own product');
  }

  const totalAmount = product.price * quantity;
  const PLATFORM_FEE_RATE = 0.03;
  const platformFeeBuyer = totalAmount * PLATFORM_FEE_RATE;
  const platformFeeSeller = totalAmount * PLATFORM_FEE_RATE;
  const netAmountSeller = totalAmount - platformFeeSeller;

  // Get delivery info from estimate if available
  const deliveryFee = deliveryEstimate?.deliveryFee || 0;
  const deliveryVehicleId = deliveryEstimate?.vehicleId || null;
  const deliveryDistance = deliveryEstimate?.distance || 0;

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
    deliveryFee,
    deliveryVehicle: deliveryVehicleId,
    deliveryDistance,
    status: 'pending_seller_approval',
    notes: notes || '',
  });

  // Auto-create an inactive shipment if we have delivery info
  if (deliveryVehicleId && deliveryDistance > 0) {
    const buyer = await User.findById(buyerId).select('latitude longitude location entityAddress');
    const seller = await User.findById(product.farmer._id).select('latitude longitude location entityAddress');
    const vehicle = await Vehicle.findById(deliveryVehicleId).populate('logisticsPartner', 'name entityName');

    if (buyer && seller && vehicle) {
      const PLATFORM_FEE_LOGISTICS = 0.02;
      const platformFeeLogistics = deliveryFee * PLATFORM_FEE_LOGISTICS;
      const netAmountLogistics = deliveryFee - platformFeeLogistics;
      const durationMinutes = (deliveryDistance / 50) * 60; // Estimate at 50 km/h

      await Shipment.create({
        order: order._id,
        buyer: buyerId,
        seller: product.farmer._id,
        logisticsPartner: vehicle.logisticsPartner?._id || vehicle.logisticsPartner,
        vehicle: deliveryVehicleId,
        pickupAddress: seller.location || seller.entityAddress || '',
        deliveryAddress: buyer.location || buyer.entityAddress || '',
        pickupCoordinates: {
          latitude: seller.latitude || 0,
          longitude: seller.longitude || 0,
        },
        deliveryCoordinates: {
          latitude: buyer.latitude || 0,
          longitude: buyer.longitude || 0,
        },
        distance: deliveryDistance,
        duration: durationMinutes,
        baseFare: 0,
        distanceFare: deliveryFee,
        timeFare: 0,
        otherCharges: 0,
        totalFare: deliveryFee,
        platformFeeLogistics,
        netAmountLogistics,
        status: 'inactive',
        paymentStatus: 'none',
        estimatedPickupTime: new Date(Date.now() + durationMinutes * 60000),
        estimatedDeliveryTime: new Date(Date.now() + durationMinutes * 2 * 60000),
      });
    }
  }

  const populatedOrder = await Order.findById(order._id)
    .populate('buyer', 'name email entityName')
    .populate('seller', 'name email entityName paymentDetails')
    .populate('product', 'name category unit image');

  return populatedOrder;
};

export const getBuyerOrders = async (buyerId, filters = {}) => {
  const {status} = filters;
  const query = {buyer: buyerId};
  
  if (status && status !== 'all') {
    query.status = status;
  }

  const orders = await Order.find(query)
    .populate('seller', 'name email entityName entityAddress paymentDetails phoneNumber')
    .populate('product', 'name category unit image')
    .populate('paymentScreenshot', 'filename _id')
    .sort({createdAt: -1});

  const ordersWithShipments = await Promise.all(
    orders.map(async (order) => {
      const shipment = await Shipment.findOne({ order: order._id })
        .select('_id status logisticsPartner vehicle totalFare')
        .populate('logisticsPartner', 'name entityName')
        .populate('vehicle', 'vehicleName vehicleNumber');
      
      const orderObj = order.toObject();
      if (shipment) {
        orderObj.shipment = {
          _id: shipment._id,
          status: shipment.status,
          logisticsPartner: shipment.logisticsPartner,
          vehicle: shipment.vehicle,
          totalFare: shipment.totalFare,
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
    .populate('buyer', 'name email entityName entityAddress phoneNumber location')
    .populate('seller', 'name email entityName entityAddress')
    .populate('product', 'name category unit image')
    .populate('paymentScreenshot', 'filename _id')
    .sort({createdAt: -1});

  const ordersWithShipments = await Promise.all(
    orders.map(async (order) => {
      const shipment = await Shipment.findOne({ order: order._id })
        .select('_id status logisticsPartner vehicle totalFare')
        .populate('logisticsPartner', 'name entityName')
        .populate('vehicle', 'vehicleName vehicleNumber');
      
      const orderObj = order.toObject();
      if (shipment) {
        orderObj.shipment = {
          _id: shipment._id,
          status: shipment.status,
          logisticsPartner: shipment.logisticsPartner,
          vehicle: shipment.vehicle,
          totalFare: shipment.totalFare,
        };
      } else {
        orderObj.shipment = null;
      }
      
      return orderObj;
    })
  );

  return ordersWithShipments;
};

/**
 * Seller payout history (admin -> seller)
 */
export const getSellerPayouts = async (sellerId, filters = {}) => {
  const { status } = filters;

  const query = { seller: sellerId };

  if (status && status !== 'all') {
    query.sellerPaymentStatus = status;
  } else {
    query.sellerPaymentStatus = { $in: ['pending', 'paid'] };
  }

  const orders = await Order.find(query)
    .populate('buyer', 'name entityName')
    .populate('product', 'name')
    .populate('sellerPaymentScreenshot', 'filename _id')
    .sort({ createdAt: -1 });

  return orders.map((order) => {
    const o = order.toObject();
    return {
      _id: o._id,
      orderId: o._id.toString(),
      buyer: o.buyer ? { _id: o.buyer._id, name: o.buyer.name, entityName: o.buyer.entityName } : null,
      product: o.product ? { _id: o.product._id, name: o.product.name } : null,
      amountPaid: o.netAmountSeller || 0,
      platformFee: o.platformFeeSeller || 0,
      status: o.sellerPaymentStatus || 'pending',
      paidAt: o.sellerPaidAt || null,
      paymentProof: o.sellerPaymentScreenshot || null,
      createdAt: o.createdAt,
      updatedAt: o.updatedAt,
    };
  });
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

/**
 * Seller accepts order → status becomes 'awaiting_payment'
 */
export const acceptOrder = async (orderId, sellerId) => {
  const order = await Order.findById(orderId);
  if (!order) {
    throw new NotFoundError('Order not found');
  }

  if (order.seller.toString() !== sellerId) {
    throw new BadRequestError('Unauthorized');
  }

  if (order.status !== 'pending_seller_approval') {
    throw new BadRequestError('Order is not pending your approval.');
  }

  const product = await Product.findById(order.product);
  if (!product) {
    throw new NotFoundError('Product not found');
  }

  if (product.quantity < order.quantity) {
    throw new BadRequestError('Insufficient quantity');
  }

  // Reserve the product quantity
  product.quantity -= order.quantity;
  await product.save();

  // Move to awaiting_payment so buyer can pay
  order.status = 'awaiting_payment';
  await order.save();

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

  if (order.status !== 'pending_seller_approval' && order.status !== 'awaiting_payment') {
    throw new BadRequestError('Order cannot be rejected');
  }

  order.status = 'rejected';
  await order.save();

  // Cancel the associated shipment
  const shipment = await Shipment.findOne({ order: orderId });
  if (shipment) {
    shipment.status = 'cancelled';
    await shipment.save();
    // Release the vehicle
    if (shipment.vehicle) {
      const vehicle = await Vehicle.findById(shipment.vehicle._id || shipment.vehicle);
      if (vehicle) {
        vehicle.isAvailable = true;
        await vehicle.save();
      }
    }
  }

  const populatedOrder = await Order.findById(order._id)
    .populate('buyer', 'name email entityName')
    .populate('seller', 'name email entityName paymentDetails')
    .populate('product', 'name category unit image')
    .populate('paymentScreenshot', 'filename _id');

  return populatedOrder;
};

/**
 * Buyer uploads payment after seller accepts
 */
export const submitPayment = async (orderId, buyerId, paymentScreenshot) => {
  const order = await Order.findById(orderId);
  if (!order) {
    throw new NotFoundError('Order not found');
  }

  if (order.buyer.toString() !== buyerId) {
    throw new BadRequestError('Unauthorized');
  }

  if (order.status !== 'awaiting_payment') {
    throw new BadRequestError('Order is not awaiting payment');
  }

  // Save payment screenshot
  let screenshotId = null;
  if (paymentScreenshot && typeof paymentScreenshot === 'string' && paymentScreenshot.startsWith('data:image')) {
    const file = await fileService.saveBase64Image(paymentScreenshot, {
      createdBy: buyerId,
      purpose: 'payment',
    });
    screenshotId = file._id;
  }

  order.paymentScreenshot = screenshotId;
  order.status = 'pending_payment_approval';
  await order.save();

  return await getOrderById(orderId);
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

/**
 * Admin approves payment → order becomes 'accepted', shipment becomes 'pending' (active/visible to logistics)
 */
export const adminApprovePayment = async (orderId) => {
  const order = await Order.findById(orderId).populate('product');
  if (!order) {
    throw new NotFoundError('Order not found');
  }

  if (order.status !== 'pending_payment_approval') {
    throw new BadRequestError('Order is not pending payment approval');
  }

  // Mark order as accepted
  order.status = 'accepted';
  order.sellerPaymentStatus = 'pending';
  await order.save();

  // Activate the shipment so logistics can see it
  const shipment = await Shipment.findOne({ order: orderId });
  if (shipment && shipment.status === 'inactive') {
    shipment.status = 'pending';
    shipment.paymentStatus = 'approved'; // payment already approved by admin
    await shipment.save();
  }

  return await getOrderById(order._id);
};

export const adminRejectOrder = async (orderId) => {
  const order = await Order.findById(orderId);
  if (!order) {
    throw new NotFoundError('Order not found');
  }

  if (order.status !== 'pending_payment_approval' && order.status !== 'pending_seller_approval' && order.status !== 'awaiting_payment') {
    throw new BadRequestError('Order cannot be rejected');
  }

  order.status = 'rejected';
  await order.save();

  // Cancel associated shipment
  const shipment = await Shipment.findOne({ order: orderId });
  if (shipment) {
    shipment.status = 'cancelled';
    await shipment.save();
    if (shipment.vehicle) {
      const vehicle = await Vehicle.findById(shipment.vehicle._id || shipment.vehicle);
      if (vehicle) {
        vehicle.isAvailable = true;
        await vehicle.save();
      }
    }
  }

  return await getOrderById(order._id);
};
