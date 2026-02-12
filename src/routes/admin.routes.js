import express from 'express';
import * as adminController from '../controllers/admin.controller.js';
import { authenticate } from '../middlewares/auth.middleware.js';
import { authorize } from '../middlewares/authorize.middleware.js';

const router = express.Router();

// Dashboard stats
router.get('/', authenticate, authorize(['admin']), adminController.getDashboardStats);

// Signup requests
router.get('/signup-requests', authenticate, authorize(['admin']), adminController.getSignupRequests);
router.post('/signup-requests/:id/approve', authenticate, authorize(['admin']), adminController.approveSignupRequest);
router.post('/signup-requests/:id/reject', authenticate, authorize(['admin']), adminController.rejectSignupRequest);

// User management
router.get('/users', authenticate, authorize(['admin']), adminController.getAllUsers);
router.post('/users/:id/block', authenticate, authorize(['admin']), adminController.blockUser);
router.post('/users/:id/unblock', authenticate, authorize(['admin']), adminController.unblockUser);

// Revenue
router.get('/revenue/recent', authenticate, authorize(['admin']), adminController.getRecentRevenue);

// Payment approvals (incoming from buyers)
router.get('/pending-payments', authenticate, authorize(['admin']), adminController.getPendingPayments);
router.post('/orders/:id/approve-payment', authenticate, authorize(['admin']), adminController.approveOrderPayment);
router.post('/orders/:id/approve-logistics-payment', authenticate, authorize(['admin']), adminController.approveLogisticsPayment);
router.post('/orders/:id/reject-logistics-payment', authenticate, authorize(['admin']), adminController.rejectLogisticsPayment);
router.post('/orders/:id/reject', authenticate, authorize(['admin']), adminController.rejectOrder);

// Outgoing payments (admin to sellers/logistics)
router.get('/outgoing-payments', authenticate, authorize(['admin']), adminController.getPendingOutgoingPayments);
router.post('/orders/:id/pay-seller', authenticate, authorize(['admin']), adminController.markSellerPaymentPaid);
router.post('/shipments/:id/pay-logistics', authenticate, authorize(['admin']), adminController.markLogisticsPaymentPaid);

// Transaction history (ledger)
router.get('/transactions', authenticate, authorize(['admin']), adminController.getAllTransactions);

// Platform Details (Public/Authenticated)
router.get('/platform-payment-details', adminController.getPlatformPaymentDetails);

export default router;
