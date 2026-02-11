import mongoose from 'mongoose';

const shipmentSchema = new mongoose.Schema(
  {
    order: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Order',
      required: [true, 'Order is required'],
      unique: true // One shipment per order
    },
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
    logisticsPartner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null // Assigned when logistics partner accepts
    },
    vehicle: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Vehicle',
      default: null // Assigned when logistics partner accepts
    },
    pickupAddress: {
      type: String,
      required: [true, 'Pickup address is required'],
      trim: true
    },
    deliveryAddress: {
      type: String,
      required: [true, 'Delivery address is required'],
      trim: true
    },
    pickupCoordinates: {
      latitude: { type: Number },
      longitude: { type: Number }
    },
    deliveryCoordinates: {
      latitude: { type: Number },
      longitude: { type: Number }
    },
    distance: {
      type: Number, // Distance in kilometers
      required: true,
      min: 0
    },
    duration: {
      type: Number, // Duration in minutes
      required: true,
      min: 0
    },
    baseFare: {
      type: Number,
      required: true,
      min: 0
    },
    distanceFare: {
      type: Number,
      required: true,
      min: 0
    },
    timeFare: {
      type: Number,
      default: 0,
      min: 0
    },
    otherCharges: {
      type: Number,
      default: 0,
      min: 0
    },
    totalFare: {
      type: Number,
      required: true,
      min: 0
    },
    platformFeeLogistics: {
      type: Number,
      default: 0,
      min: 0
    },
    netAmountLogistics: {
      type: Number,
      default: 0,
      min: 0
    },
    status: {
      type: String,
      enum: ['pending', 'assigned', 'picked_up', 'in_transit', 'delivered', 'cancelled'],
      default: 'pending'
    },
    estimatedPickupTime: {
      type: Date
    },
    estimatedDeliveryTime: {
      type: Date
    },
    actualPickupTime: {
      type: Date
    },
    actualDeliveryTime: {
      type: Date
    },
    notes: {
      type: String,
      trim: true
    },
    paymentStatus: {
      type: String,
      enum: ['none', 'pending', 'approved', 'rejected'],
      default: 'none'
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

export default mongoose.model('Shipment', shipmentSchema);

