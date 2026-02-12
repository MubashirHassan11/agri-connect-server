import Shipment from '../models/Shipment.js';
import Order from '../models/Order.js';
import User from '../models/User.js';
import Vehicle from '../models/Vehicle.js';
import { NotFoundError, BadRequestError } from '../utils/errors.js';
import * as fileService from './file.service.js';

const getRouteInfo = async (origin, destination, apiKey) => {
  try {
    const url = `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${encodeURIComponent(origin)}&destinations=${encodeURIComponent(destination)}&key=${apiKey}&units=metric`;

    const response = await fetch(url);
    const data = await response.json();

    if (data.status !== 'OK' || !data.rows[0] || !data.rows[0].elements[0]) {
      throw new Error('Failed to get route information from Google Maps');
    }

    const element = data.rows[0].elements[0];

    if (element.status !== 'OK') {
      throw new Error(`Route calculation failed: ${element.status}`);
    }

    const distanceKm = element.distance.value / 1000;
    const durationMinutes = element.duration.value / 60;
    const originCoords = await geocodeAddress(origin, apiKey);
    const destCoords = await geocodeAddress(destination, apiKey);

    return {
      distance: distanceKm,
      duration: durationMinutes,
      originCoordinates: originCoords,
      destinationCoordinates: destCoords
    };
  } catch (error) {
    console.error('Error getting route info:', error);
    throw new BadRequestError(error.message || 'Failed to calculate route');
  }
};

const geocodeAddress = async (address, apiKey) => {
  try {
    const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${apiKey}`;

    const response = await fetch(url);
    const data = await response.json();

    if (data.status !== 'OK' || !data.results[0]) {
      throw new Error('Failed to geocode address');
    }

    const location = data.results[0].geometry.location;
    return {
      latitude: location.lat,
      longitude: location.lng
    };
  } catch (error) {
    console.error('Error geocoding address:', error);
    return { latitude: null, longitude: null };
  }
};

const calculateDistance = (lat1, lon1, lat2, lon2) => {
  // Haversine formula to calculate distance between two coordinates
  const R = 6371; // Radius of the Earth in kilometers
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;
  return Math.round(distance * 100) / 100; // Round to 2 decimal places
};

const calculateFare = (distance, vehicleRatePerKm, otherCharges = 0) => {
  const distanceFare = distance * vehicleRatePerKm;
  const totalFare = distanceFare + otherCharges;

  return {
    distanceFare,
    otherCharges,
    totalFare: Math.round(totalFare * 100) / 100
  };
};

export const createShipment = async (orderId, buyerId, shipmentData, apiKey) => {
  const {
    vehicleId,
    pickupAddress: customPickupAddress,
    deliveryAddress: customDeliveryAddress,
    pickupCoordinates: customPickupCoordinates,
    deliveryCoordinates: customDeliveryCoordinates,
    paymentScreenshot,
    logisticsPaymentScreenshot: altLogisticsPaymentScreenshot
  } = shipmentData;

  const logisticsPaymentScreenshot = paymentScreenshot || altLogisticsPaymentScreenshot;

  if (!vehicleId) {
    throw new BadRequestError('Vehicle ID is required');
  }

  const order = await Order.findById(orderId)
    .populate('buyer', 'entityAddress')
    .populate('seller', 'entityAddress')
    .populate('product');

  if (!order) {
    throw new NotFoundError('Order not found');
  }

  if (order.buyer._id.toString() !== buyerId) {
    throw new BadRequestError('Unauthorized');
  }

  if (order.status !== 'accepted') {
    throw new BadRequestError('Order must be accepted');
  }

  const existingShipment = await Shipment.findOne({ order: orderId });
  if (existingShipment) {
    throw new BadRequestError('Shipment already exists');
  }

  const vehicle = await Vehicle.findById(vehicleId).populate('logisticsPartner');
  if (!vehicle) {
    throw new NotFoundError('Vehicle not found');
  }

  if (!vehicle.isAvailable) {
    throw new BadRequestError('Vehicle is not available');
  }

  const orderWeight = order.quantity || 0;
  if (orderWeight > vehicle.weightCapacity && vehicle.unit === 'kg') {
    throw new BadRequestError(`Order weight exceeds vehicle capacity (${vehicle.weightCapacity} ${vehicle.unit})`);
  }

  // Use custom addresses if provided, otherwise fall back to default addresses
  const pickupAddress = customPickupAddress || order.seller.entityAddress;
  const deliveryAddress = customDeliveryAddress || order.buyer.entityAddress;

  if (!pickupAddress || !deliveryAddress) {
    throw new BadRequestError('Pickup or delivery address is missing');
  }

  // Calculate route info
  let routeInfo;
  if (customPickupCoordinates && customDeliveryCoordinates) {
    // If custom coordinates are provided, use them with Google Maps API for accurate route
    const originCoords = {
      latitude: customPickupCoordinates.latitude,
      longitude: customPickupCoordinates.longitude
    };
    const destCoords = {
      latitude: customDeliveryCoordinates.latitude,
      longitude: customDeliveryCoordinates.longitude
    };

    try {
      // Use coordinates with Distance Matrix API for accurate distance and duration
      const originStr = `${originCoords.latitude},${originCoords.longitude}`;
      const destStr = `${destCoords.latitude},${destCoords.longitude}`;
      const url = `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${encodeURIComponent(originStr)}&destinations=${encodeURIComponent(destStr)}&key=${apiKey}&units=metric`;

      const response = await fetch(url);
      const data = await response.json();

      if (data.status === 'OK' && data.rows[0] && data.rows[0].elements[0] && data.rows[0].elements[0].status === 'OK') {
        const element = data.rows[0].elements[0];
        const distanceKm = element.distance.value / 1000;
        const durationMinutes = element.duration.value / 60;

        routeInfo = {
          distance: distanceKm,
          duration: durationMinutes,
          originCoordinates: originCoords,
          destinationCoordinates: destCoords
        };
      } else {
        // Fallback to Haversine formula if API fails
        const distanceKm = calculateDistance(
          originCoords.latitude,
          originCoords.longitude,
          destCoords.latitude,
          destCoords.longitude
        );
        const durationMinutes = (distanceKm / 50) * 60;

        routeInfo = {
          distance: distanceKm,
          duration: durationMinutes,
          originCoordinates: originCoords,
          destinationCoordinates: destCoords
        };
      }
    } catch (error) {
      console.error('Error getting route info from coordinates:', error);
      // Fallback to Haversine formula
      const distanceKm = calculateDistance(
        originCoords.latitude,
        originCoords.longitude,
        destCoords.latitude,
        destCoords.longitude
      );
      const durationMinutes = (distanceKm / 50) * 60;

      routeInfo = {
        distance: distanceKm,
        duration: durationMinutes,
        originCoordinates: originCoords,
        destinationCoordinates: destCoords
      };
    }
  } else {
    // Fall back to geocoding addresses
    routeInfo = await getRouteInfo(pickupAddress, deliveryAddress, apiKey);
  }

  const fare = calculateFare(routeInfo.distance, vehicle.ratePerKm, 0);

  const PLATFORM_FEE_RATE = 0.02;
  const platformFeeLogistics = fare.totalFare * PLATFORM_FEE_RATE;
  const netAmountLogistics = fare.totalFare - platformFeeLogistics;

  // Handle logistics payment screenshot
  let savedPaymentScreenshot = null;
  let paymentStatus = 'none';

  if (logisticsPaymentScreenshot && typeof logisticsPaymentScreenshot === 'string' && logisticsPaymentScreenshot.startsWith('data:image')) {
    const file = await fileService.saveBase64Image(logisticsPaymentScreenshot, {
      createdBy: buyerId,
      purpose: 'payment',
    });
    savedPaymentScreenshot = file._id;
    paymentStatus = 'pending';
  }

  const shipment = await Shipment.create({
    order: orderId,
    buyer: buyerId,
    seller: order.seller._id,
    logisticsPartner: vehicle.logisticsPartner._id,
    vehicle: vehicleId,
    pickupAddress,
    deliveryAddress,
    pickupCoordinates: routeInfo.originCoordinates,
    deliveryCoordinates: routeInfo.destinationCoordinates,
    distance: routeInfo.distance,
    duration: routeInfo.duration,
    baseFare: 0,
    distanceFare: fare.distanceFare,
    timeFare: 0,
    otherCharges: 0,
    totalFare: fare.totalFare,
    platformFeeLogistics,
    netAmountLogistics,
    status: 'pending',
    paymentStatus,
    paymentScreenshot: savedPaymentScreenshot,
    estimatedPickupTime: new Date(Date.now() + routeInfo.duration * 60000),
    estimatedDeliveryTime: new Date(Date.now() + routeInfo.duration * 2 * 60000)
  });

  // Update order status only (removed payment fields from Order in next steps)
  order.logisticsPaymentStatus = paymentStatus;
  await order.save();

  vehicle.isAvailable = false;
  await vehicle.save();

  return await Shipment.findById(shipment._id)
    .populate('order', 'product quantity totalAmount')
    .populate('buyer', 'name email entityName entityAddress')
    .populate('seller', 'name email entityName entityAddress')
    .populate('logisticsPartner', 'name email entityName phoneNumber')
    .populate('vehicle', 'vehicleName vehicleNumber vehicleType ratePerKm weightCapacity unit');
};

export const getShipmentById = async (shipmentId) => {
  const shipment = await Shipment.findById(shipmentId)
    .populate('order', 'product quantity totalAmount status')
    .populate('buyer', 'name email entityName entityAddress phoneNumber')
    .populate('seller', 'name email entityName entityAddress phoneNumber')
    .populate('logisticsPartner', 'name email entityName phoneNumber')
    .populate('vehicle', 'vehicleName vehicleNumber vehicleType ratePerKm weightCapacity unit');

  if (!shipment) {
    throw new NotFoundError('Shipment not found');
  }

  return shipment;
};

export const getBuyerShipments = async (buyerId, filters = {}) => {
  const { status } = filters;
  const query = { buyer: buyerId };

  if (status && status !== 'all') {
    query.status = status;
  }

  return await Shipment.find(query)
    .populate({
      path: 'order',
      select: '_id product quantity totalAmount logisticsPaymentStatus',
      populate: { path: 'product', select: 'name' }
    })
    .populate('seller', 'name email entityName entityAddress')
    .populate('logisticsPartner', 'name email entityName phoneNumber')
    .populate('vehicle', 'vehicleName vehicleNumber vehicleType ratePerKm weightCapacity unit')
    .sort({ createdAt: -1 });
};

export const getSellerShipments = async (sellerId, filters = {}) => {
  const { status } = filters;
  const query = { seller: sellerId };

  if (status && status !== 'all') {
    query.status = status;
  }

  return await Shipment.find(query)
    .populate({
      path: 'order',
      select: '_id product quantity totalAmount status',
      populate: { path: 'product', select: 'name' }
    })
    .populate('buyer', 'name email entityName entityAddress')
    .populate('logisticsPartner', 'name email entityName phoneNumber')
    .populate('vehicle', 'vehicleName vehicleNumber vehicleType ratePerKm weightCapacity unit')
    .sort({ createdAt: -1 });
};

export const getAvailableShipments = async (logisticsPartnerId, filters = {}) => {
  const { status } = filters;
  const query = { logisticsPartner: logisticsPartnerId };

  // Only filter by status if explicitly provided and not 'all'
  if (status && status !== 'all') {
    query.status = status;
  }
  // If status is 'all' or not provided, don't filter by status (return all shipments for this logistics partner)

  return await Shipment.find(query)
    .populate({
      path: 'order',
      select: '_id product quantity totalAmount logisticsPaymentStatus',
      populate: { path: 'product', select: 'name' }
    })
    .populate('buyer', 'name email entityName entityAddress phoneNumber')
    .populate('seller', 'name email entityName entityAddress phoneNumber')
    .populate('vehicle', 'vehicleName vehicleNumber vehicleType ratePerKm weightCapacity unit')
    .sort({ createdAt: -1 });
};

/**
 * Logistics payout history (admin -> logistics partner)
 */
export const getLogisticsPayouts = async (logisticsPartnerId, filters = {}) => {
  const { status } = filters;

  const query = { logisticsPartner: logisticsPartnerId };

  if (status && status !== 'all') {
    query.adminLogisticsPaymentStatus = status;
  } else {
    query.adminLogisticsPaymentStatus = { $in: ['pending', 'paid'] };
  }

  const shipments = await Shipment.find(query)
    .populate('buyer', 'name entityName phoneNumber')
    .populate('seller', 'name entityName phoneNumber')
    .populate('adminLogisticsPaymentScreenshot', 'filename _id')
    .populate({
      path: 'order',
      select: '_id product',
      populate: { path: 'product', select: 'name' }
    })
    .sort({ createdAt: -1 });

  return shipments.map((shipment) => {
    const s = shipment.toObject();
    return {
      _id: s._id,
      shipmentId: s._id.toString(),
      orderId: s.order?._id ? s.order._id.toString() : null,
      buyer: s.buyer ? { _id: s.buyer._id, name: s.buyer.name, entityName: s.buyer.entityName } : null,
      seller: s.seller ? { _id: s.seller._id, name: s.seller.name, entityName: s.seller.entityName } : null,
      product: s.order?.product ? { _id: s.order.product._id, name: s.order.product.name } : null,
      pickupAddress: s.pickupAddress,
      deliveryAddress: s.deliveryAddress,
      amountPaid: s.netAmountLogistics || 0,
      platformFee: s.platformFeeLogistics || 0,
      status: s.adminLogisticsPaymentStatus || 'pending',
      paidAt: s.adminLogisticsPaidAt || null,
      paymentProof: s.adminLogisticsPaymentScreenshot || null,
      createdAt: s.createdAt,
      updatedAt: s.updatedAt,
    };
  });
};

export const acceptShipment = async (shipmentId, logisticsPartnerId) => {
  const shipment = await Shipment.findById(shipmentId).populate('vehicle').populate('order');

  if (!shipment) {
    throw new NotFoundError('Shipment not found');
  }

  if (shipment.status !== 'pending') {
    throw new BadRequestError('Shipment not available');
  }

  if (shipment.paymentStatus !== 'approved') {
    throw new BadRequestError('Logistics payment must be approved by admin first');
  }

  if (shipment.logisticsPartner?.toString() !== logisticsPartnerId) {
    throw new BadRequestError('Unauthorized');
  }

  const logisticsPartner = await User.findById(logisticsPartnerId);
  if (!logisticsPartner || logisticsPartner.userType !== 'logisctics') {
    throw new BadRequestError('Not a logistics partner');
  }

  if (!shipment.vehicle) {
    throw new BadRequestError('Vehicle not assigned to shipment');
  }

  const vehicle = await Vehicle.findById(shipment.vehicle._id || shipment.vehicle);
  if (!vehicle) {
    throw new NotFoundError('Vehicle not found');
  }

  if (vehicle.logisticsPartner.toString() !== logisticsPartnerId) {
    throw new BadRequestError('Vehicle not yours');
  }

  shipment.status = 'assigned';
  await shipment.save();

  return await getShipmentById(shipmentId);
};

export const rejectShipment = async (shipmentId, logisticsPartnerId) => {
  const shipment = await Shipment.findById(shipmentId).populate('vehicle');

  if (!shipment) {
    throw new NotFoundError('Shipment not found');
  }

  if (shipment.status !== 'pending') {
    throw new BadRequestError('Shipment not available');
  }

  if (shipment.logisticsPartner?.toString() !== logisticsPartnerId) {
    throw new BadRequestError('Unauthorized');
  }

  if (shipment.vehicle) {
    const vehicle = await Vehicle.findById(shipment.vehicle._id || shipment.vehicle);
    if (vehicle) {
      vehicle.isAvailable = true;
      await vehicle.save();
    }
  }

  shipment.status = 'cancelled';
  await shipment.save();

  return await getShipmentById(shipmentId);
};

export const updateShipmentStatus = async (shipmentId, logisticsPartnerId, newStatus) => {
  const shipment = await Shipment.findById(shipmentId).populate('vehicle');

  if (!shipment) {
    throw new NotFoundError('Shipment not found');
  }

  if (shipment.logisticsPartner?.toString() !== logisticsPartnerId) {
    throw new BadRequestError('Unauthorized');
  }

  const validStatuses = ['assigned', 'picked_up', 'in_transit', 'delivered'];
  if (!validStatuses.includes(newStatus)) {
    throw new BadRequestError('Invalid status');
  }

  shipment.status = newStatus;

  if (newStatus === 'picked_up' && !shipment.actualPickupTime) {
    shipment.actualPickupTime = new Date();
  }

  if (newStatus === 'delivered' && !shipment.actualDeliveryTime) {
    shipment.actualDeliveryTime = new Date();

    if (shipment.vehicle) {
      const vehicle = await Vehicle.findById(shipment.vehicle._id || shipment.vehicle);
      if (vehicle) {
        vehicle.isAvailable = true;
        await vehicle.save();
      }
    }

    const order = await Order.findById(shipment.order);
    if (order && order.status === 'accepted') {
      order.status = 'shipped';
      await order.save();
    }
  }

  await shipment.save();
  return await getShipmentById(shipmentId);
};

export const getAllShipments = async (filters = {}) => {
  const { status, search } = filters;
  const query = {};

  if (status && status !== 'all') {
    query.status = status;
  }

  let shipments = await Shipment.find(query)
    .populate({
      path: 'order',
      select: 'product quantity totalAmount status',
      populate: {
        path: 'product',          // populate the product inside order
        select: 'name price', // choose fields you need from product
      },
    })
    .populate('buyer', 'name email entityName phoneNumber entityAddress')
    .populate('seller', 'name email entityName phoneNumber entityAddress')
    .populate('logisticsPartner', 'name email entityName phoneNumber entityAddress')
    .sort({ createdAt: -1 });
  // Filter by search if provided
  if (search) {
    const searchLower = search.toLowerCase();
    shipments = shipments.filter(shipment => {
      const buyerName = shipment.buyer?.name?.toLowerCase() || '';
      const sellerName = shipment.seller?.name?.toLowerCase() || '';
      const logisticsName = shipment.logisticsPartner?.name?.toLowerCase() || '';
      const shipmentId = shipment._id.toString().toLowerCase();
      return buyerName.includes(searchLower) ||
        sellerName.includes(searchLower) ||
        logisticsName.includes(searchLower) ||
        shipmentId.includes(searchLower);
    });
  }

  return shipments;
};

