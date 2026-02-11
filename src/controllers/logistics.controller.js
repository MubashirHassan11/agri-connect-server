import * as logisticsService from '../services/logistics.service.js';
import { sendSuccess, sendError } from '../utils/response.js';

export const createShipment = async (req, res) => {
  try {
    const buyerId = req.user?.userId || req.user?.id;
    const { orderId } = req.params;
    const { 
      vehicleId, 
      pickupAddress, 
      deliveryAddress, 
      pickupCoordinates, 
      deliveryCoordinates,
      paymentScreenshot
    } = req.body;

    if (!vehicleId) {
      return sendError(res, 'Vehicle ID is required', 400);
    }

    const apiKey = process.env.GOOGLE_MAPS_API_KEY;
    if (!apiKey) {
      return sendError(res, 'Google Maps API key is not configured', 500);
    }

    const shipment = await logisticsService.createShipment(
      orderId,
      buyerId,
      req.body,
      apiKey
    );

    return sendSuccess(res, shipment, 'Shipment request created successfully', 201);
  } catch (error) {
    return sendError(res, error.message, error.status || 400);
  }
};

export const getShipmentById = async (req, res) => {
  try {
    const { id } = req.params;
    const shipment = await logisticsService.getShipmentById(id);
    return sendSuccess(res, shipment, 'Shipment retrieved successfully');
  } catch (error) {
    return sendError(res, error.message, error.status || 400);
  }
};

export const getBuyerShipments = async (req, res) => {
  try {
    const buyerId = req.user?.userId || req.user?.id;
    const { status } = req.query;
    const shipments = await logisticsService.getBuyerShipments(buyerId, { status });
    return sendSuccess(res, shipments, 'Shipments retrieved successfully');
  } catch (error) {
    return sendError(res, error.message, error.status || 400);
  }
};

export const getSellerShipments = async (req, res) => {
  try {
    const sellerId = req.user?.userId || req.user?.id;
    const { status } = req.query;
    const shipments = await logisticsService.getSellerShipments(sellerId, { status });
    return sendSuccess(res, shipments, 'Shipments retrieved successfully');
  } catch (error) {
    return sendError(res, error.message, error.status || 400);
  }
};

export const getAvailableShipments = async (req, res) => {
  try {
    const logisticsPartnerId = req.user?.userId || req.user?.id;
    const { vehicleType, maxDistance, status } = req.query;
    const shipments = await logisticsService.getAvailableShipments(logisticsPartnerId, {
      vehicleType,
      maxDistance: maxDistance ? parseFloat(maxDistance) : undefined,
      status: status || 'all'
    });
    return sendSuccess(res, shipments, 'Available shipments retrieved successfully');
  } catch (error) {
    return sendError(res, error.message, error.status || 400);
  }
};

export const acceptShipment = async (req, res) => {
  try {
    const logisticsPartnerId = req.user?.userId || req.user?.id;
    const { id } = req.params;

    const shipment = await logisticsService.acceptShipment(id, logisticsPartnerId);
    return sendSuccess(res, shipment, 'Shipment accepted successfully');
  } catch (error) {
    return sendError(res, error.message, error.status || 400);
  }
};

export const rejectShipment = async (req, res) => {
  try {
    const logisticsPartnerId = req.user?.userId || req.user?.id;
    const { id } = req.params;

    const shipment = await logisticsService.rejectShipment(id, logisticsPartnerId);
    return sendSuccess(res, shipment, 'Shipment rejected successfully');
  } catch (error) {
    return sendError(res, error.message, error.status || 400);
  }
};

export const updateShipmentStatus = async (req, res) => {
  try {
    const logisticsPartnerId = req.user?.userId || req.user?.id;
    const { id } = req.params;
    const { status } = req.body;
    const shipment = await logisticsService.updateShipmentStatus(
      id,
      logisticsPartnerId,
      status
    );
    return sendSuccess(res, shipment, 'Shipment status updated successfully');
  } catch (error) {
    return sendError(res, error.message, error.status || 400);
  }
};

export const getAllShipments = async (req, res) => {
  try {
    const { status, search } = req.query;
    const shipments = await logisticsService.getAllShipments({ status, search });
    return sendSuccess(res, shipments, 'Shipments retrieved successfully');
  } catch (error) {
    return sendError(res, error.message, error.status || 400);
  }
};

