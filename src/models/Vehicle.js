import mongoose from 'mongoose';

const vehicleSchema = new mongoose.Schema(
  {
    logisticsPartner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Logistics partner is required']
    },
    vehicleType: {
      type: String,
      enum: ['tractor', 'truck'],
      required: [true, 'Vehicle type is required']
    },
    vehicleName: {
      type: String,
      required: [true, 'Vehicle name is required'],
      trim: true
    },
    vehicleNumber: {
      type: String,
      required: [true, 'Vehicle number is required'],
      trim: true,
      unique: true
    },
    ratePerKm: {
      type: Number,
      required: [true, 'Rate per kilometer is required'],
      min: [0, 'Rate must be positive']
    },
    weightCapacity: {
      type: Number,
      required: [true, 'Weight capacity is required'],
      min: [0, 'Weight capacity must be positive']
    },
    unit: {
      type: String,
      enum: ['kg', 'ton'],
      default: 'kg'
    },
    isAvailable: {
      type: Boolean,
      default: true
    },
    description: {
      type: String,
      trim: true
    }
  },
  {
    timestamps: true
  }
);

// Index for faster queries
vehicleSchema.index({ logisticsPartner: 1, isAvailable: 1 });

export default mongoose.model('Vehicle', vehicleSchema);


