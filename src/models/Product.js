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
    category: {
      type: String,
      required: [true, 'Category is required'],
      trim: true
    }
  },
  {
    timestamps: true
  }
);

export default mongoose.model('Product', productSchema);
