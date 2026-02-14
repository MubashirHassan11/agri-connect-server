import User from '../models/User.js';
import { sendError } from '../utils/response.js';
import { USER_TYPES } from '../constants/userTypes.js';

// Map user types to roles
const USER_TYPE_TO_ROLE = {
  [USER_TYPES.BUYER]: 'buyer',
  [USER_TYPES.FARMER]: 'seller',
  [USER_TYPES.LOGISTICS]: 'logisctics',
  [USER_TYPES.ADMIN]: 'admin'
};

export const authorize = (allowedRoles) => {
  return async (req, res, next) => {
    try {
      const userId = req.user?.userId || req.user?.id;
      
      if (!userId) {
        return sendError(res, 'User ID not found in token', 401);
      }

      // Get user from database to check role
      const user = await User.findById(userId).select('userType status isBlocked');
      
      if (!user) {
        return sendError(res, 'User not found', 404);
      }

      if (user.isBlocked) {
        return sendError(res, 'User account is blocked', 403);
      }

      if (user.status !== 'approved' && user.userType !== USER_TYPES.ADMIN) {
        return sendError(res, 'User account is not approved', 403);
      }

      // Map user type to role
      const userRole = USER_TYPE_TO_ROLE[user.userType];
      
      if (!userRole) {
        return sendError(res, 'Invalid user type', 403);
      }

      // Check if user role is allowed
      if (!allowedRoles.includes(userRole)) {
        return sendError(res, 'Access denied. Insufficient permissions', 403);
      }

      // Add user info to request
      req.user.userId = userId;
      req.user.userType = user.userType;
      req.user.role = userRole;
      
      next();
    } catch (error) {
      return sendError(res, error.message || 'Authorization failed', 500);
    }
  };
};


