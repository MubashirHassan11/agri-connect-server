import * as authService from '../services/auth.service.js';
import logger from '../utils/logger.js';
import { sendSuccess, sendError } from '../utils/response.js';

export const register = async (req, res) => {
  try {
    const result = await authService.register(req.body);
    return sendSuccess(res, result, 'User registered successfully', 201);
  } catch (error) {
    return sendError(res, error.message, error.status || 400);
  }
};

export const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const result = await authService.login(email, password);
    return sendSuccess(res, result, 'Login successful');
  } catch (error) {
    logger.error('App login error', error);
    return sendError(res, error.message, 401);
  }
};
