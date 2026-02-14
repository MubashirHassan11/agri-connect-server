import Cart from '../models/Cart.js';
import Product from '../models/Product.js';
import User from '../models/User.js';
import Vehicle from '../models/Vehicle.js';
import {NotFoundError, BadRequestError} from '../utils/errors.js';
import * as orderService from './order.service.js';
import * as fileService from './file.service.js';

export const getCart = async (buyerId) => {
  let cart = await Cart.findOne({buyer: buyerId})
    .populate('items.product', 'name price quantity minPurchase unit image')
    .populate('items.seller', 'name entityName entityAddress phoneNumber paymentDetails');

  if (!cart) {
    cart = await Cart.create({buyer: buyerId, items: []});
  }

  return cart;
};

export const addOrUpdateItem = async (buyerId, {productId, quantity}) => {
  if (!productId) {
    throw new BadRequestError('Product ID is required');
  }

  if (quantity <= 0) {
    return await removeItem(buyerId, productId);
  }

  const product = await Product.findById(productId).populate('farmer');
  if (!product) {
    throw new NotFoundError('Product not found');
  }

  // Prevent buyer from adding their own product
  if (product.farmer && product.farmer._id.toString() === buyerId) {
    throw new BadRequestError('You cannot add your own product to the cart');
  }

  // Enforce minimum purchase quantity
  if (product.minPurchase && quantity < product.minPurchase) {
    throw new BadRequestError(`Minimum purchase quantity is ${product.minPurchase} ${product.unit || 'kg'}`);
  }

  // Enforce maximum (available) quantity
  if (quantity > product.quantity) {
    throw new BadRequestError(`Only ${product.quantity} ${product.unit || 'kg'} available`);
  }

  let cart = await Cart.findOne({buyer: buyerId});
  if (!cart) {
    cart = await Cart.create({buyer: buyerId, items: []});
  }

  const existingIndex = cart.items.findIndex(
    (item) => item.product.toString() === productId
  );

  if (existingIndex >= 0) {
    cart.items[existingIndex].quantity = quantity;
    cart.items[existingIndex].price = product.price;
    cart.items[existingIndex].unit = product.unit || 'kg';
    cart.items[existingIndex].seller = product.farmer?._id;
  } else {
    cart.items.push({
      product: product._id,
      seller: product.farmer?._id,
      quantity,
      price: product.price,
      unit: product.unit || 'kg',
    });
  }

  await cart.save();

  return await getCart(buyerId);
};

export const removeItem = async (buyerId, productId) => {
  const cart = await Cart.findOne({buyer: buyerId});
  if (!cart) {
    return null;
  }

  cart.items = cart.items.filter(
    (item) => item.product.toString() !== productId
  );
  await cart.save();

  return await getCart(buyerId);
};

export const clearCart = async (buyerId) => {
  const cart = await Cart.findOne({buyer: buyerId});
  if (!cart) {
    return null;
  }
  cart.items = [];
  await cart.save();
  return cart;
};

export const checkout = async (buyerId) => {
  const cart = await Cart.findOne({buyer: buyerId})
    .populate({
      path: 'items.product',
      select: 'name price quantity unit farmer',
      populate: {path: 'farmer', select: 'name entityName latitude longitude location entityAddress'}
    })
    .populate('items.seller', 'name entityName latitude longitude location entityAddress');

  if (!cart || cart.items.length === 0) {
    throw new BadRequestError('Cart is empty');
  }

  // Get buyer location
  const buyer = await User.findById(buyerId).select('latitude longitude location entityAddress');

  // Get delivery estimates per seller-group for each order
  const sellerItemsMap = {};
  for (const item of cart.items) {
    const sellerId = (item.seller?._id || item.seller)?.toString();
    if (!sellerId) continue;
    if (!sellerItemsMap[sellerId]) {
      sellerItemsMap[sellerId] = { totalWeight: 0, seller: item.seller && item.seller._id ? item.seller : (item.product?.farmer || null) };
    }
    sellerItemsMap[sellerId].totalWeight += item.quantity;
  }

  // Pre-calculate best vehicle per seller
  const availableVehicles = await Vehicle.find({isAvailable: true}).sort({ratePerKm: 1});
  const sellerDeliveryMap = {};

  for (const sellerId of Object.keys(sellerItemsMap)) {
    const group = sellerItemsMap[sellerId];
    const seller = group.seller;
    if (buyer?.latitude && buyer?.longitude && seller?.latitude && seller?.longitude) {
      const distance = calculateDistance(seller.latitude, seller.longitude, buyer.latitude, buyer.longitude);
      let bestVehicle = null;
      for (const v of availableVehicles) {
        let capacityKg = v.unit === 'ton' ? v.weightCapacity * 1000 : v.weightCapacity;
        if (capacityKg >= group.totalWeight) {
          bestVehicle = v;
          break;
        }
      }
      if (bestVehicle) {
        sellerDeliveryMap[sellerId] = {
          distance,
          deliveryFee: Math.round(distance * bestVehicle.ratePerKm * 100) / 100,
          vehicleId: bestVehicle._id,
        };
      }
    }
  }

  const createdOrders = [];

  for (const item of cart.items) {
    const sellerId = (item.seller?._id || item.seller)?.toString();
    const deliveryInfo = sellerDeliveryMap[sellerId] || null;

    const order = await orderService.createOrder(
      {
        productId: item.product?._id || item.product,
        quantity: item.quantity,
        notes: '',
        deliveryEstimate: deliveryInfo,
      },
      buyerId
    );
    createdOrders.push(order);
  }

  // Clear cart after successful checkout
  cart.items = [];
  await cart.save();

  return createdOrders;
};

/**
 * Haversine formula to calculate distance between two coordinates (in km)
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

/**
 * Estimate delivery fee for all items in the buyer's cart.
 * Groups items by seller, calculates distance from each seller to buyer,
 * finds the cheapest available vehicle that can carry the total weight,
 * and returns the estimated fare per seller plus the grand total.
 */
export const estimateDeliveryFee = async (buyerId) => {
  const buyer = await User.findById(buyerId).select('latitude longitude location');
  if (!buyer) {
    throw new NotFoundError('Buyer not found');
  }

  if (!buyer.latitude || !buyer.longitude) {
    throw new BadRequestError('Buyer location is not set. Please update your profile with a delivery location.');
  }

  const cart = await Cart.findOne({buyer: buyerId})
    .populate({
      path: 'items.product',
      select: 'name price quantity unit farmer',
      populate: {path: 'farmer', select: 'name entityName latitude longitude location'}
    })
    .populate('items.seller', 'name entityName latitude longitude location');

  if (!cart || cart.items.length === 0) {
    throw new BadRequestError('Cart is empty');
  }

  // Group items by seller
  const sellerGroups = {};
  for (const item of cart.items) {
    const sellerId = (item.seller?._id || item.seller)?.toString();
    if (!sellerId) continue;

    if (!sellerGroups[sellerId]) {
      const seller = item.seller && item.seller._id ? item.seller : (item.product?.farmer || null);
      sellerGroups[sellerId] = {
        sellerId,
        sellerName: seller?.entityName || seller?.name || 'Unknown',
        sellerLat: seller?.latitude,
        sellerLng: seller?.longitude,
        sellerLocation: seller?.location || '',
        totalWeight: 0,
        items: [],
      };
    }
    sellerGroups[sellerId].totalWeight += item.quantity;
    sellerGroups[sellerId].items.push({
      productName: item.product?.name || 'Unknown',
      quantity: item.quantity,
      unit: item.unit || 'kg',
    });
  }

  // Get all available vehicles (sorted by ratePerKm ascending)
  const availableVehicles = await Vehicle.find({isAvailable: true})
    .sort({ratePerKm: 1});

  const sellerEstimates = [];
  let grandTotalDelivery = 0;

  for (const key of Object.keys(sellerGroups)) {
    const group = sellerGroups[key];

    if (!group.sellerLat || !group.sellerLng) {
      sellerEstimates.push({
        sellerId: group.sellerId,
        sellerName: group.sellerName,
        sellerLocation: group.sellerLocation,
        totalWeight: group.totalWeight,
        items: group.items,
        distance: null,
        vehicle: null,
        deliveryFee: null,
        error: 'Seller location not available',
      });
      continue;
    }

    // Calculate distance
    const distance = calculateDistance(
      group.sellerLat, group.sellerLng,
      buyer.latitude, buyer.longitude
    );

    // Find cheapest vehicle that can handle the weight
    // Convert totalWeight to kg if vehicle unit is ton
    let bestVehicle = null;
    for (const v of availableVehicles) {
      let capacityKg = v.weightCapacity;
      if (v.unit === 'ton') {
        capacityKg = v.weightCapacity * 1000;
      }
      if (capacityKg >= group.totalWeight) {
        bestVehicle = v;
        break; // Already sorted by ratePerKm ascending, so first match is cheapest
      }
    }

    if (!bestVehicle) {
      sellerEstimates.push({
        sellerId: group.sellerId,
        sellerName: group.sellerName,
        sellerLocation: group.sellerLocation,
        totalWeight: group.totalWeight,
        items: group.items,
        distance,
        vehicle: null,
        deliveryFee: null,
        error: 'No vehicle available for this weight',
      });
      continue;
    }

    const deliveryFee = Math.round(distance * bestVehicle.ratePerKm * 100) / 100;
    grandTotalDelivery += deliveryFee;

    sellerEstimates.push({
      sellerId: group.sellerId,
      sellerName: group.sellerName,
      sellerLocation: group.sellerLocation,
      totalWeight: group.totalWeight,
      items: group.items,
      distance,
      vehicle: {
        _id: bestVehicle._id,
        vehicleName: bestVehicle.vehicleName,
        vehicleType: bestVehicle.vehicleType,
        ratePerKm: bestVehicle.ratePerKm,
        weightCapacity: bestVehicle.weightCapacity,
        unit: bestVehicle.unit,
      },
      deliveryFee,
      error: null,
    });
  }

  return {
    buyerLocation: buyer.location || `${buyer.latitude}, ${buyer.longitude}`,
    sellerEstimates,
    totalDeliveryFee: Math.round(grandTotalDelivery * 100) / 100,
  };
};

