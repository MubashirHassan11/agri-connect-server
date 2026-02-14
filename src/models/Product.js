import mongoose from 'mongoose';

const productSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Product name is required'],
      trim: true
    },
    price: {
      type: Number,
      required: [true, 'Price is required'],
      min: [0, 'Price must be positive']
    },
    quantity: {
      type: Number,
      required: [true, 'Quantity is required'],
      min: [0, 'Quantity must be positive']
    },
    minPurchase: {
      type: Number,
      default: 1,
      min: [1, 'Minimum purchase must be at least 1']
    },
    category: {
      type: String,
      required: [true, 'Category is required'],
      trim: true
    },
    farmer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Farmer is required']
    },
    unit: {
      type: String,
      default: 'kg',
      trim: true
    },
    description: {
      type: String,
      trim: true
    },
    quality: {
      type: Number,
      min: [0, 'Quality must be between 0 and 10'],
      max: [10, 'Quality must be between 0 and 10']
    },
    image: {
      type: String,
      trim: true
    },
    gallery: {
      type: [String],
      default: [],
      validate: {
        validator: function(v) {
          return v.length <= 5;
        },
        message: 'Gallery can have maximum 5 images'
      }
    },
    published: {
      type: Boolean,
      default: true
    }
  },
  {
    timestamps: true
  }
);

export default mongoose.model('Product', productSchema);
