import Satisfaction from '../models/Satisfaction.js';
import Order from '../models/Order.js';
import {NotFoundError, BadRequestError, ConflictError} from '../utils/errors.js';

export const createSatisfaction = async (satisfactionData, reviewerId) => {
  const {
    orderId,
    role,
    productQuality,
    deliveryTime,
    communication,
    packaging,
    paymentTimeliness,
    overallRating,
    comments,
    wouldRecommend
  } = satisfactionData;

  const order = await Order.findById(orderId)
    .populate('buyer', 'name email entityName')
    .populate('seller', 'name email entityName')
    .populate('product', 'name');

  if (!order) {
    throw new NotFoundError('Order not found');
  }

  const isBuyer = order.buyer._id.toString() === reviewerId;
  const isSeller = order.seller._id.toString() === reviewerId;

  if (!isBuyer && !isSeller) {
    throw new BadRequestError('Unauthorized');
  }

  if ((role === 'buyer' && !isBuyer) || (role === 'seller' && !isSeller)) {
    throw new BadRequestError('Role mismatch');
  }

  const existingReview = await Satisfaction.findOne({
    order: orderId,
    reviewer: reviewerId
  });

  if (existingReview) {
    throw new ConflictError('Review already exists');
  }

  const reviewedParty = role === 'buyer' ? order.seller._id : order.buyer._id;

  if (role === 'buyer' && !packaging) {
    throw new BadRequestError('Packaging rating required');
  }

  if (role === 'seller' && !paymentTimeliness) {
    throw new BadRequestError('Payment timeliness rating required');
  }

  const satisfaction = await Satisfaction.create({
    order: orderId,
    reviewer: reviewerId,
    reviewedParty,
    product: order.product._id,
    role,
    productQuality,
    deliveryTime,
    communication,
    packaging: role === 'buyer' ? packaging : undefined,
    paymentTimeliness: role === 'seller' ? paymentTimeliness : undefined,
    overallRating,
    comments: comments || '',
    wouldRecommend
  });

  const populatedSatisfaction = await Satisfaction.findById(satisfaction._id)
    .populate({
      path: 'reviewer',
      select: 'name email entityName avatar',
      populate: {
        path: 'avatar',
        select: '_id'
      }
    })
    .populate('reviewedParty', 'name email entityName')
    .populate('product', 'name category')
    .populate('order', 'quantity totalAmount status');

  // Convert avatar ObjectId to URL format
  if (populatedSatisfaction.reviewer && populatedSatisfaction.reviewer.avatar) {
    populatedSatisfaction.reviewer.profilePic = `/api/files/${populatedSatisfaction.reviewer.avatar._id.toString()}`;
  }

  return populatedSatisfaction;
};

export const getUserSatisfactionReviews = async (userId) => {
  const reviews = await Satisfaction.find({ reviewer: userId })
    .populate('reviewedParty', 'name email entityName')
    .populate('product', 'name category')
    .populate('order', 'quantity totalAmount status')
    .sort({ createdAt: -1 });

  return reviews;
};

export const getReceivedSatisfactionReviews = async (userId) => {
  const reviews = await Satisfaction.find({ reviewedParty: userId })
    .populate({
      path: 'reviewer',
      select: 'name email entityName avatar',
      populate: {
        path: 'avatar',
        select: '_id'
      }
    })
    .populate('product', 'name category')
    .populate('order', 'quantity totalAmount status')
    .sort({ createdAt: -1 });

  // Convert avatar ObjectId to URL format
  reviews.forEach(review => {
    if (review.reviewer && review.reviewer.avatar) {
      review.reviewer.profilePic = `/api/files/${review.reviewer.avatar._id.toString()}`;
    }
  });

  return reviews;
};

export const getAllSatisfactionReviews = async (filters = {}) => {
  const {role, search} = filters;
  const query = {};

  if (role && role !== 'all') {
    query.role = role;
  }

  let reviews = await Satisfaction.find(query)
    .populate({
      path: 'reviewer',
      select: 'name email entityName avatar',
      populate: {
        path: 'avatar',
        select: '_id'
      }
    })
    .populate('reviewedParty', 'name email entityName')
    .populate('product', 'name category')
    .populate('order', 'quantity totalAmount status')
    .sort({ createdAt: -1 });

  // Convert avatar ObjectId to URL format
  reviews.forEach(review => {
    if (review.reviewer && review.reviewer.avatar) {
      review.reviewer.profilePic = `/api/files/${review.reviewer.avatar._id.toString()}`;
    }
  });

  if (search) {
    const searchLower = search.toLowerCase();
    reviews = reviews.filter(review => {
      const reviewerName = review.reviewer?.name?.toLowerCase() || review.reviewer?.entityName?.toLowerCase() || '';
      const reviewedName = review.reviewedParty?.name?.toLowerCase() || review.reviewedParty?.entityName?.toLowerCase() || '';
      const productName = review.product?.name?.toLowerCase() || '';
      const orderId = review.order?._id?.toString().toLowerCase() || '';
      return reviewerName.includes(searchLower) || 
             reviewedName.includes(searchLower) || 
             productName.includes(searchLower) ||
             orderId.includes(searchLower);
    });
  }

  return reviews;
};

export const getSatisfactionById = async (reviewId) => {
  const review = await Satisfaction.findById(reviewId)
    .populate({
      path: 'reviewer',
      select: 'name email entityName entityAddress avatar',
      populate: {
        path: 'avatar',
        select: '_id'
      }
    })
    .populate('reviewedParty', 'name email entityName entityAddress')
    .populate('product', 'name category unit image')
    .populate('order', 'quantity totalAmount status createdAt');

  if (!review) {
    throw new NotFoundError('Satisfaction review not found');
  }

  // Convert avatar ObjectId to URL format
  const reviewObj = review.toObject();
  if (reviewObj.reviewer && reviewObj.reviewer.avatar) {
    if (reviewObj.reviewer.avatar._id) {
      // Avatar is populated as an object with _id
      reviewObj.reviewer.profilePic = `/api/files/${reviewObj.reviewer.avatar._id.toString()}`;
    } else if (typeof reviewObj.reviewer.avatar === 'string') {
      // Avatar is already a string (ObjectId), convert it
      reviewObj.reviewer.profilePic = `/api/files/${reviewObj.reviewer.avatar}`;
    } else if (reviewObj.reviewer.avatar.toString) {
      // Avatar is an ObjectId object, convert it
      reviewObj.reviewer.profilePic = `/api/files/${reviewObj.reviewer.avatar.toString()}`;
    }
    // Remove the avatar ObjectId reference as we've converted it to profilePic
    delete reviewObj.reviewer.avatar;
  }

  return reviewObj;
};

export const getOrderSatisfactionReviews = async (orderId) => {
  const reviews = await Satisfaction.find({ order: orderId })
    .populate({
      path: 'reviewer',
      select: 'name email entityName avatar',
      populate: {
        path: 'avatar',
        select: '_id'
      }
    })
    .populate('reviewedParty', 'name email entityName')
    .populate('product', 'name category')
    .sort({ createdAt: -1 });

  // Convert avatar ObjectId to URL format
  const reviewsArray = reviews.map(review => {
    const reviewObj = review.toObject();
    if (reviewObj.reviewer && reviewObj.reviewer.avatar) {
      if (reviewObj.reviewer.avatar._id) {
        // Avatar is populated as an object with _id
        reviewObj.reviewer.profilePic = `/api/files/${reviewObj.reviewer.avatar._id.toString()}`;
      } else if (typeof reviewObj.reviewer.avatar === 'string') {
        // Avatar is already a string (ObjectId), convert it
        reviewObj.reviewer.profilePic = `/api/files/${reviewObj.reviewer.avatar}`;
      } else if (reviewObj.reviewer.avatar.toString) {
        // Avatar is an ObjectId object, convert it
        reviewObj.reviewer.profilePic = `/api/files/${reviewObj.reviewer.avatar.toString()}`;
      }
      // Remove the avatar ObjectId reference as we've converted it to profilePic
      delete reviewObj.reviewer.avatar;
    }
    return reviewObj;
  });

  return reviewsArray;
};

/**
 * Get satisfaction reviews for a specific product
 */
export const getProductSatisfactionReviews = async (productId) => {
  if (!productId || !/^[0-9a-fA-F]{24}$/.test(productId)) {
    throw new BadRequestError('Invalid product ID format');
  }

  const reviews = await Satisfaction.find({ product: productId })
    .populate({
      path: 'reviewer',
      select: 'name email entityName avatar',
      populate: {
        path: 'avatar',
        select: '_id'
      }
    })
    .populate('reviewedParty', 'name email entityName')
    .populate('order', 'quantity totalAmount status')
    .sort({ createdAt: -1 });

  // Convert avatar ObjectId to URL format
  const reviewsArray = reviews.map(review => {
    const reviewObj = review.toObject();
    if (reviewObj.reviewer) {
      // Check if avatar exists and has _id
      if (reviewObj.reviewer.avatar) {
        if (reviewObj.reviewer.avatar._id) {
          // Avatar is populated as an object with _id
          reviewObj.reviewer.profilePic = `/api/files/${reviewObj.reviewer.avatar._id.toString()}`;
        } else if (typeof reviewObj.reviewer.avatar === 'string') {
          // Avatar is already a string (ObjectId), convert it
          reviewObj.reviewer.profilePic = `/api/files/${reviewObj.reviewer.avatar}`;
        } else if (reviewObj.reviewer.avatar.toString) {
          // Avatar is an ObjectId object, convert it
          reviewObj.reviewer.profilePic = `/api/files/${reviewObj.reviewer.avatar.toString()}`;
        }
      }
      // Remove the avatar ObjectId reference as we've converted it to profilePic
      delete reviewObj.reviewer.avatar;
    }
    return reviewObj;
  });

  return reviewsArray;
};



