import mongoose from 'mongoose';

const satisfactionSchema = new mongoose.Schema(
  {
    order: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Order',
      required: [true, 'Order is required']
    },
    reviewer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Reviewer is required']
    },
    reviewedParty: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Reviewed party is required']
    },
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: [true, 'Product is required']
    },
    role: {
      type: String,
      enum: ['buyer', 'seller'],
      required: [true, 'Role is required']
    },
    // Ratings (1-5 scale)
    productQuality: {
      type: Number,
      required: [true, 'Product quality rating is required'],
      min: [1, 'Rating must be at least 1'],
      max: [5, 'Rating must be at most 5']
    },
    deliveryTime: {
      type: Number,
      required: [true, 'Delivery time rating is required'],
      min: [1, 'Rating must be at least 1'],
      max: [5, 'Rating must be at most 5']
    },
    communication: {
      type: Number,
      required: [true, 'Communication rating is required'],
      min: [1, 'Rating must be at least 1'],
      max: [5, 'Rating must be at most 5']
    },
    packaging: {
      type: Number,
      min: [1, 'Rating must be at least 1'],
      max: [5, 'Rating must be at most 5']
      // Optional - only for buyer reviews
    },
    paymentTimeliness: {
      type: Number,
      min: [1, 'Rating must be at least 1'],
      max: [5, 'Rating must be at most 5']
      // Optional - only for seller reviews
    },
    overallRating: {
      type: Number,
      required: [true, 'Overall rating is required'],
      min: [1, 'Rating must be at least 1'],
      max: [5, 'Rating must be at most 5']
    },
    comments: {
      type: String,
      trim: true,
      default: ''
    },
    wouldRecommend: {
      type: Boolean,
      required: [true, 'Would recommend is required'],
      default: true
    }
  },
  {
    timestamps: true
  }
);

// Prevent duplicate reviews from same reviewer for same order
satisfactionSchema.index({ order: 1, reviewer: 1 }, { unique: true });

export default mongoose.model('Satisfaction', satisfactionSchema);




