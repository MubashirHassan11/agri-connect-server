import * as authService from '../services/auth.service.js';
import logger from '../utils/logger.js';
import {sendSuccess, sendError} from '../utils/response.js';
import {BadRequestError} from '../utils/errors.js';

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
    const {email, password} = req.body;
    const result = await authService.login(email, password);
    return sendSuccess(res, result, 'Login successful');
  } catch (error) {
    logger.error('App login error', error);
    return sendError(res, error.message, 401);
  }
};

export const requestPasswordReset = async (req, res) => {
  try {
    const {email} = req.body;
    if (!email) {
      throw new BadRequestError('Email is required');
    }
    authService.sendPasswordResetLink(email);
    return sendSuccess(
      res,
      null,
      'If an account with that email exists, a password reset link has been sent.'
    );
  } catch (error) {
    logger.error('Password reset request error', error);
    return sendError(res, error.message, error.status || 500);
  }
};

export const resetPassword = async (req, res) => {
  try {
    const {token, password} = req.body;
    const result = await authService.resetPassword(token, password);
    return sendSuccess(res, result, 'Password reset successfully');
  } catch (error) {
    logger.error('Password reset error', error);
    return sendError(res, error.message, error.status || 400);
  }
};
