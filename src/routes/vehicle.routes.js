import express from 'express';
import * as vehicleController from '../controllers/vehicle.controller.js';
import { authenticate } from '../middlewares/auth.middleware.js';
import { authorize } from '../middlewares/authorize.middleware.js';

const router = express.Router();

// Get available vehicles (for buyer to choose from) - public for buyers
router.get('/available', authenticate, authorize(['buyer']), vehicleController.getAvailableVehicles);

// All other routes require authentication and logistics partner role
router.use(authenticate);
router.use(authorize(['logisctics']));

// Create vehicle
router.post('/', vehicleController.createVehicle);

// Get all vehicles for logistics partner
router.get('/', vehicleController.getLogisticsPartnerVehicles);

// Get vehicle by ID
router.get('/:id', vehicleController.getVehicleById);

// Update vehicle
router.put('/:id', vehicleController.updateVehicle);

// Delete vehicle
router.delete('/:id', vehicleController.deleteVehicle);

export default router;

