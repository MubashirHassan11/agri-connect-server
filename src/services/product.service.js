import Product from '../models/Product.js';
import {NotFoundError} from '../utils/errors.js';
import * as fileService from './file.service.js';

export const createProduct = async (productData, farmerId) => {
  const data = {...productData};

  // If image is a base64 data URL, store it in File collection and replace with URL
  if (data.image && typeof data.image === 'string' && data.image.startsWith('data:image')) {
    const file = await fileService.saveBase64Image(data.image, {
      createdBy: farmerId,
      purpose: 'product',
    });

    // Frontend will access image via Next.js proxy route /api/files/[id]
    data.image = `/api/files/${file._id.toString()}`;
  }

  // Process gallery images
  if (data.gallery && Array.isArray(data.gallery) && data.gallery.length > 0) {
    const galleryFiles = await Promise.all(
      data.gallery
        .filter(img => typeof img === 'string' && img.startsWith('data:image'))
        .map(base64Image => 
          fileService.saveBase64Image(base64Image, {
            createdBy: farmerId,
            purpose: 'product-gallery',
          })
        )
    );

    // Replace base64 strings with file URLs
    data.gallery = galleryFiles.map(file => `/api/files/${file._id.toString()}`);
  }

  const product = await Product.create({
    ...data,
    farmer: farmerId,
  });
  return product;
};

export const getAllProducts = async (filters = {}) => {
  const {farmerId, published} = filters;
  const query = {};
  
  // If farmerId is provided, filter by farmer
  if (farmerId) {
    query.farmer = farmerId;
  }
  
  // Published filter logic
  // - If "published" is explicitly provided, filter by it
  // - Otherwise, include both documents with published=true and documents
  //   where the field doesn't exist (for older seed data)
  if (published !== undefined) {
    query.published = published;
  } else {
    query.$or = [{published: true}, {published: {$exists: false}}];
  }
  
  const products = await Product.find(query)
    .populate('farmer', 'name entityName entityAddress')
    .sort({createdAt: -1});
  return products;
};

export const getProductById = async (productId) => {
  const product = await Product.findById(productId).populate('farmer', 'name entityName entityAddress');
  if (!product) {
    throw new NotFoundError('Product not found');
  }
  return product;
};

export const updateProduct = async (productId, updateData) => {
  const data = {...updateData};

  if (data.image && typeof data.image === 'string' && data.image.startsWith('data:image')) {
    const existing = await Product.findById(productId);
    const createdBy = existing?.farmer;

    const file = await fileService.saveBase64Image(data.image, {
      createdBy,
      purpose: 'product',
    });

    data.image = `/api/files/${file._id.toString()}`;
  }

  // Process gallery images
  if (data.gallery && Array.isArray(data.gallery) && data.gallery.length > 0) {
    const existing = await Product.findById(productId);
    const createdBy = existing?.farmer;

    // Separate existing URLs from new base64 images
    const existingUrls = data.gallery.filter(img => typeof img === 'string' && !img.startsWith('data:image'));
    const newBase64Images = data.gallery.filter(img => typeof img === 'string' && img.startsWith('data:image'));

    // Process new base64 images
    if (newBase64Images.length > 0) {
      const galleryFiles = await Promise.all(
        newBase64Images.map(base64Image => 
          fileService.saveBase64Image(base64Image, {
            createdBy,
            purpose: 'product-gallery',
          })
        )
      );

      // Combine existing URLs with new file URLs
      data.gallery = [...existingUrls, ...galleryFiles.map(file => `/api/files/${file._id.toString()}`)];
    } else {
      // Only existing URLs, keep them as is
      data.gallery = existingUrls;
    }
  }

  const product = await Product.findByIdAndUpdate(productId, data, {
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
