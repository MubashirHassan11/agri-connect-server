import * as productService from '../services/product.service.js';
import {sendSuccess, sendError} from '../utils/response.js';

export const createProduct = async (req, res) => {
  try {
    const farmerId = req.user?.userId || req.user?.id;
    const product = await productService.createProduct(req.body, farmerId);
    return sendSuccess(res, product, 'Product created successfully', 201);
  } catch (error) {
    return sendError(res, error.message, 400);
  }
};

export const getAllProducts = async (req, res) => {
  try {
    const {farmerId, published} = req.query;
    const filters = {};
    
    // If user is a farmer, show their own products regardless of published status
    if (req.user) {
      // For authenticated farmers, allow viewing their own products
      // For others, only show published products
      filters.published = published !== 'false';
    } else {
      // For unauthenticated users, only show published products
      filters.published = true;
    }
    
    // Allow filtering by specific farmer if provided
    if (farmerId) {
      filters.farmerId = farmerId;
    }
    
    const products = await productService.getAllProducts(filters);
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
