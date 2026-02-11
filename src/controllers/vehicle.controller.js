import * as vehicleService from '../services/vehicle.service.js';
import { sendSuccess, sendError } from '../utils/response.js';

export const createVehicle = async (req, res) => {
  try {
    const logisticsPartnerId = req.user?.userId || req.user?.id;
    const vehicle = await vehicleService.createVehicle(logisticsPartnerId, req.body);
    return sendSuccess(res, vehicle, 'Vehicle created successfully', 201);
  } catch (error) {
    return sendError(res, error.message, error.status || 400);
  }
};

export const getVehicleById = async (req, res) => {
  try {
    const { id } = req.params;
    const vehicle = await vehicleService.getVehicleById(id);
    return sendSuccess(res, vehicle, 'Vehicle retrieved successfully');
  } catch (error) {
    return sendError(res, error.message, error.status || 400);
  }
};

export const getLogisticsPartnerVehicles = async (req, res) => {
  try {
    const logisticsPartnerId = req.user?.userId || req.user?.id;
    const { isAvailable, vehicleType } = req.query;
    const vehicles = await vehicleService.getLogisticsPartnerVehicles(logisticsPartnerId, {
      isAvailable: isAvailable === 'true' ? true : isAvailable === 'false' ? false : undefined,
      vehicleType
    });
    return sendSuccess(res, vehicles, 'Vehicles retrieved successfully');
  } catch (error) {
    return sendError(res, error.message, error.status || 400);
  }
};

export const updateVehicle = async (req, res) => {
  try {
    const logisticsPartnerId = req.user?.userId || req.user?.id;
    const { id } = req.params;
    const vehicle = await vehicleService.updateVehicle(id, logisticsPartnerId, req.body);
    return sendSuccess(res, vehicle, 'Vehicle updated successfully');
  } catch (error) {
    return sendError(res, error.message, error.status || 400);
  }
};

export const deleteVehicle = async (req, res) => {
  try {
    const logisticsPartnerId = req.user?.userId || req.user?.id;
    const { id } = req.params;
    const result = await vehicleService.deleteVehicle(id, logisticsPartnerId);
    return sendSuccess(res, result, 'Vehicle deleted successfully');
  } catch (error) {
    return sendError(res, error.message, error.status || 400);
  }
};

export const getAvailableVehicles = async (req, res) => {
  try {
    const { vehicleType, minCapacity } = req.query;
    const filters = {
      vehicleType: vehicleType || null,
      minCapacity: minCapacity ? parseFloat(minCapacity) : null,
    };
    const vehicles = await vehicleService.getAvailableVehicles(filters);
    return sendSuccess(res, vehicles, 'Available vehicles fetched successfully');
  } catch (error) {
    return sendError(res, error.message, error.status || 400);
  }
};

