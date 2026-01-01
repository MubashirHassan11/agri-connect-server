import {sendError} from '../utils/response.js';
import {verifyToken} from '../utils/jwt.js';

const publicRoutes = ['/api/auth', '/api/docs'];

const isPublicRoute = (path) => {
  return publicRoutes.some((route) => path.startsWith(route));
};

export const authenticate = async (req, res, next) => {
  if (isPublicRoute(req.path)) {
    return next();
  }

  try {
    const token = req.headers.authorization?.split(' ')[1];

    if (!token) {
      return sendError(res, 'No token provided', 401);
    }

    const decoded = verifyToken(token);
    req.user = decoded;
    next();
  } catch (error) {
    return sendError(res, error.message || 'Invalid token', 401);
  }
};

// TODO implement admin/farmer/buyer
export const authorize = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];

    if (!token) {
      return sendError(res, 'No token provided', 401);
    }

    const decoded = verifyToken(token);
    req.user = decoded;
    next();
  } catch (error) {
    return sendError(res, error.message || 'Invalid token', 401);
  }
};
