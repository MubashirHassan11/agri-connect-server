import Product from '../models/Product.js';
import {NotFoundError} from '../utils/errors.js';

export const createProduct = async (productData) => {
  const product = await Product.create(productData);
  return product;
};

export const getAllProducts = async () => {
  const products = await Product.find();
  return products;
};

export const getProductById = async (productId) => {
  const product = await Product.findById(productId);
  if (!product) {
    throw new NotFoundError('Product not found');
  }
  return product;
};

export const updateProduct = async (productId, updateData) => {
  const product = await Product.findByIdAndUpdate(productId, updateData, {
    new: true,
    runValidators: true
  });
  if (!product) {
    throw new NotFoundError('Product not found');
  }
  return product;
};

export const deleteProduct = async (productId) => {
  const product = await Product.findByIdAndDelete(productId);
  if (!product) {
    throw new NotFoundError('Product not found');
  }
  return product;
};
