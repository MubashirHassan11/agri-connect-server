import express from 'express';
import * as logisticsController from '../controllers/logistics.controller.js';
import { authenticate } from '../middlewares/auth.middleware.js';
import { authorize } from '../middlewares/authorize.middleware.js';

const router = express.Router();

// Create shipment (seller only)
router.post(
  '/orders/:orderId/shipment',
  authenticate,
  authorize(['seller']),
  logisticsController.createShipment
);

// Get all shipments (admin) - must come before /shipments/:id
router.get(
  '/shipments',
  authenticate,
  authorize(['admin']),
  logisticsController.getAllShipments
);

// Get buyer shipments - must come before /shipments/:id
router.get(
  '/shipments/buyer',
  authenticate,
  authorize(['buyer']),
  logisticsController.getBuyerShipments
);

// Get seller shipments - must come before /shipments/:id
router.get(
  '/shipments/seller',
  authenticate,
  authorize(['seller']),
  logisticsController.getSellerShipments
);

// Get available shipments (logistics partner) - must come before /shipments/:id
router.get(
  '/shipments/available',
  authenticate,
  authorize(['logisctics']),
  logisticsController.getAvailableShipments
);

// Logistics partner payouts (admin -> logistics partner) - must come before /shipments/:id
router.get(
  '/shipments/payouts',
  authenticate,
  authorize(['logisctics']),
  logisticsController.getLogisticsPayouts
);

// Get shipment by ID - must come after all specific routes
router.get(
  '/shipments/:id',
  authenticate,
  logisticsController.getShipmentById
);

// Accept shipment (logistics partner)
router.post(
  '/shipments/:id/accept',
  authenticate,
  authorize(['logisctics']),
  logisticsController.acceptShipment
);

// Reject shipment (logistics partner)
router.post(
  '/shipments/:id/reject',
  authenticate,
  authorize(['logisctics']),
  logisticsController.rejectShipment
);

// Update shipment status (logistics partner)
router.patch(
  '/shipments/:id/status',
  authenticate,
  authorize(['logisctics']),
  logisticsController.updateShipmentStatus
);

export default router;

