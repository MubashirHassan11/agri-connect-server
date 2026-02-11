import mongoose from 'mongoose';

const orderSchema = new mongoose.Schema(
  {
    buyer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Buyer is required']
    },
    seller: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Seller is required']
    },
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: [true, 'Product is required']
    },
    quantity: {
      type: Number,
      required: [true, 'Quantity is required'],
      min: [0, 'Quantity must be positive']
    },
    price: {
      type: Number,
      required: [true, 'Price is required'],
      min: [0, 'Price must be positive']
    },
    totalAmount: {
      type: Number,
      required: [true, 'Total amount is required'],
      min: [0, 'Total amount must be positive']
    },
    platformFeeBuyer: {
      type: Number,
      default: 0,
      min: [0, 'Platform fee must be positive']
    },
    platformFeeSeller: {
      type: Number,
      default: 0,
      min: [0, 'Platform fee must be positive']
    },
    netAmountSeller: {
      type: Number,
      default: 0,
      min: [0, 'Net amount must be positive']
    },
    status: {
      type: String,
      enum: ['pending_payment_approval', 'payment_approved', 'accepted', 'rejected', 'confirmed', 'shipped', 'delivered', 'cancelled'],
      default: 'pending_payment_approval'
    },
    logisticsPaymentStatus: {
      type: String,
      enum: ['none', 'pending', 'approved', 'rejected'],
      default: 'none'
    },
    logisticsPaymentScreenshot: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'File'
    },
    notes: {
      type: String,
      trim: true
    },
    paymentScreenshot: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'File'
    }
  },
  {
    timestamps: true
  }
);

export default mongoose.model('Order', orderSchema);



