import * as productService from '../services/product.service.js';
import {sendSuccess, sendError} from '../utils/response.js';

export const createProduct = async (req, res) => {
  try {
    const product = await productService.createProduct(req.body);
    return sendSuccess(res, product, 'Product created successfully', 201);
  } catch (error) {
    return sendError(res, error.message, 400);
  }
};

export const getAllProducts = async (req, res) => {
  try {
    const products = await productService.getAllProducts();
    return sendSuccess(res, products, 'Products fetched successfully');
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

export const getProductById = async (req, res) => {
  try {
    const {id} = req.params;
    const product = await productService.getProductById(id);
    return sendSuccess(res, product, 'Product fetched successfully');
  } catch (error) {
    return sendError(res, error.message, error.status || 404);
  }
};

export const updateProduct = async (req, res) => {
  try {
    const {id} = req.params;
    const product = await productService.updateProduct(id, req.body);
    return sendSuccess(res, product, 'Product updated successfully');
  } catch (error) {
    return sendError(res, error.message, error.status || 404);
  }
};

export const deleteProduct = async (req, res) => {
  try {
    const {id} = req.params;
    await productService.deleteProduct(id);
    return sendSuccess(res, null, 'Product deleted successfully');
  } catch (error) {
    return sendError(res, error.message, error.status || 404);
  }
};
