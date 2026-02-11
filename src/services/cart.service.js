import Cart from '../models/Cart.js';
import Product from '../models/Product.js';
import {NotFoundError, BadRequestError} from '../utils/errors.js';
import * as orderService from './order.service.js';
import * as fileService from './file.service.js';

export const getCart = async (buyerId) => {
  let cart = await Cart.findOne({buyer: buyerId})
    .populate('items.product', 'name price unit image')
    .populate('items.seller', 'name entityName entityAddress paymentDetails');

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

export const checkout = async (buyerId, paymentScreenshot) => {
  const cart = await Cart.findOne({buyer: buyerId});
  if (!cart || cart.items.length === 0) {
    throw new BadRequestError('Cart is empty');
  }

  let paymentScreenshotId = null;
  if (paymentScreenshot) {
    const file = await fileService.saveBase64Image(paymentScreenshot, {
      createdBy: buyerId,
      purpose: 'payment'
    });
    paymentScreenshotId = file._id;
  }

  const createdOrders = [];

  for (const item of cart.items) {
    const order = await orderService.createOrder(
      {
        productId: item.product,
        quantity: item.quantity,
        notes: '',
        paymentScreenshot: paymentScreenshotId
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





