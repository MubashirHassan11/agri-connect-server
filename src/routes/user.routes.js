import express from 'express';
import * as userController from '../controllers/user.controller.js';
import {authenticate} from '../middlewares/auth.middleware.js';

const router = express.Router();

router.get('/', userController.getAllUsers);

router.get('/:id', userController.getUserById);

// Update current user (authenticated user's own profile)
router.put('/me', authenticate, userController.updateCurrentUser);

export default router;
