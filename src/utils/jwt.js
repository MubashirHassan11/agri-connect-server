import jwt from 'jsonwebtoken';
import env from '../config/env.js';

export const generateToken = (userId) => {
  return jwt.sign({userId}, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRES_IN
  });
};

export const verifyToken = (token) => {
  return jwt.verify(token, env.JWT_SECRET);
};

export const generatePasswordResetToken = (userId, email) => {
  if (!env.JWT_PASSWORD_RESET_SECRET) {
    throw new Error('JWT_PASSWORD_RESET_SECRET is not configured');
  }
  return jwt.sign({userId, email, type: 'password-reset'}, env.JWT_PASSWORD_RESET_SECRET, {
    expiresIn: '1h'
  });
};

export const verifyPasswordResetToken = (token) => {
  if (!env.JWT_PASSWORD_RESET_SECRET) {
    throw new Error('JWT_PASSWORD_RESET_SECRET is not configured');
  }
  try {
    const decoded = jwt.verify(token, env.JWT_PASSWORD_RESET_SECRET);
    if (decoded.type !== 'password-reset') {
      throw new Error('Invalid token type');
    }
    return decoded;
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      throw new Error('Token has expired');
    }
    if (error.name === 'JsonWebTokenError') {
      throw new Error('Invalid token');
    }
    throw error;
  }
};
