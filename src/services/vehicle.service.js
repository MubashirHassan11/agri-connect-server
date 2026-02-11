import Vehicle from '../models/Vehicle.js';
import { NotFoundError, BadRequestError } from '../utils/errors.js';

export const createVehicle = async (logisticsPartnerId, vehicleData) => {
  const { vehicleType, vehicleName, vehicleNumber, ratePerKm, weightCapacity, unit, description } = vehicleData;

  const existingVehicle = await Vehicle.findOne({ vehicleNumber });
  if (existingVehicle) {
    throw new BadRequestError('Vehicle with this number already exists');
  }

  const vehicle = await Vehicle.create({
    logisticsPartner: logisticsPartnerId,
    vehicleType,
    vehicleName,
    vehicleNumber,
    ratePerKm,
    weightCapacity,
    unit: unit || 'kg',
    description,
    isAvailable: true
  });

  return vehicle;
};

export const getVehicleById = async (vehicleId) => {
  const vehicle = await Vehicle.findById(vehicleId).populate('logisticsPartner', 'name email entityName');
  
  if (!vehicle) {
    throw new NotFoundError('Vehicle not found');
  }

  return vehicle;
};

export const getLogisticsPartnerVehicles = async (logisticsPartnerId, filters = {}) => {
  const { isAvailable, vehicleType } = filters;
  const query = { logisticsPartner: logisticsPartnerId };

  if (isAvailable !== undefined) {
    query.isAvailable = isAvailable;
  }

  if (vehicleType) {
    query.vehicleType = vehicleType;
  }

  return await Vehicle.find(query).sort({ createdAt: -1 });
};

export const updateVehicle = async (vehicleId, logisticsPartnerId, updateData) => {
  const vehicle = await Vehicle.findById(vehicleId);

  if (!vehicle) {
    throw new NotFoundError('Vehicle not found');
  }

  if (vehicle.logisticsPartner.toString() !== logisticsPartnerId) {
    throw new BadRequestError('Unauthorized');
  }

  if (updateData.vehicleNumber && updateData.vehicleNumber !== vehicle.vehicleNumber) {
    const existingVehicle = await Vehicle.findOne({ vehicleNumber: updateData.vehicleNumber });
    if (existingVehicle) {
      throw new BadRequestError('Vehicle with this number already exists');
    }
  }

  Object.assign(vehicle, updateData);
  await vehicle.save();

  return vehicle;
};

export const deleteVehicle = async (vehicleId, logisticsPartnerId) => {
  const vehicle = await Vehicle.findById(vehicleId);

  if (!vehicle) {
    throw new NotFoundError('Vehicle not found');
  }

  if (vehicle.logisticsPartner.toString() !== logisticsPartnerId) {
    throw new BadRequestError('Unauthorized');
  }

  if (!vehicle.isAvailable) {
    throw new BadRequestError('Vehicle in use');
  }

  await Vehicle.findByIdAndDelete(vehicleId);
  return { message: 'Vehicle deleted successfully' };
};

export const getAvailableVehicles = async (filters = {}) => {
  const { vehicleType, minCapacity } = filters;
  const query = { isAvailable: true };

  if (vehicleType) {
    query.vehicleType = vehicleType;
  }
  if (minCapacity) {
    query.weightCapacity = { $gte: minCapacity };
  }

  return await Vehicle.find(query)
    .populate('logisticsPartner', 'name entityName phoneNumber')
    .sort({ createdAt: -1 });
};

